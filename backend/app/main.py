import copy
import hashlib
import hmac
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import UUID

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import ValidationError
from sqlalchemy import text, update
from sqlalchemy.exc import SQLAlchemyError

from app import examples
from app.budget import budget_from_lines, normalize_lines, unknown_budget
from app.config import database_url
from app.db import make_database
from app.llm import FakeLLM, LLMClient
from app.models import Trip
from app.schemas import BudgetUpdate, Itinerary, LockUpdate, StopUpdate, StoredItinerary, TripRequest


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Lien ou jeton de lecture requis.")
    return _hash(authorization[7:])


def _role(trip: Trip | None, token_hash: str) -> str:
    # Same 404 for unknown trip and wrong secret: the id alone reveals nothing.
    if trip is None:
        raise HTTPException(404, "Voyage introuvable.")
    if trip.edit_token_hash and hmac.compare_digest(trip.edit_token_hash, token_hash):
        return "organizer"
    if hmac.compare_digest(trip.read_token_hash, token_hash):
        return "reader"
    raise HTTPException(404, "Voyage introuvable.")


def _serialize(trip: Trip, role: str) -> dict:
    prefs = trip.preferences
    lines = (trip.budget_inputs or {}).get("lines")
    return {
        "id": trip.id, "created_at": trip.created_at, "updated_at": trip.updated_at,
        "revision": trip.revision, "role": role, "editable": trip.edit_token_hash is not None,
        "is_example": bool(trip.is_example), "preferences": prefs,
        "itinerary": StoredItinerary.model_validate(trip.itinerary).model_dump(mode="json"),
        # Recomputed on every read so old trips get the same budget shape.
        "budget": budget_from_lines(lines, prefs["travelers"], prefs["budget_cents"]),
        "budget_lines": normalize_lines(lines),
        "generator": trip.generator, "place_verification": "not_implemented",
    }


def _find_stop(itinerary: StoredItinerary, day_number: int, index: int):
    day = next((d for d in itinerary.days if d.number == day_number), None)
    if day is None or not 0 <= index < len(day.stops):
        raise _error(404, "stop_not_found", "Activité introuvable dans ce programme.")
    return day.stops[index]


def create_app(url: str | None = None, llm: LLMClient | None = None) -> FastAPI:
    if llm is None and os.getenv("LLM_PROVIDER", "fake") != "fake":
        raise RuntimeError("Seul LLM_PROVIDER=fake est disponible dans cette tranche.")
    engine, sessions = make_database(url or database_url())
    generator = llm or FakeLLM()

    @asynccontextmanager
    async def lifespan(app):
        yield
        engine.dispose()

    app = FastAPI(title="Runaway", version="0.2.0", lifespan=lifespan)
    app.state.engine = engine

    def store(trip: Trip, response: Response, read_token: str, edit_token: str) -> dict:
        try:
            with sessions.begin() as session:
                session.add(trip)
                session.flush()
                trip_id = trip.id
        except SQLAlchemyError:
            raise HTTPException(503, "Sauvegarde indisponible. Vérifiez la base et ses migrations.") from None
        response.headers["Cache-Control"] = "no-store"
        return {"id": trip_id, "read_token": read_token, "edit_token": edit_token, "generator": trip.generator}

    def new_secrets():
        read_token, edit_token = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        return read_token, edit_token, {"read_token_hash": _hash(read_token), "edit_token_hash": _hash(edit_token)}

    def write(trip_id: UUID, authorization: str | None, expected: int, mutate, response: Response) -> dict:
        token_hash = _bearer(authorization)
        try:
            with sessions.begin() as session:
                trip = session.get(Trip, str(trip_id))
                if _role(trip, token_hash) != "organizer":
                    raise _error(403, "read_only", "Ce lien donne un accès en lecture seule.")
                if trip.revision != expected:
                    raise _error(409, "revision_conflict",
                                 "Le voyage a changé depuis votre dernier chargement. Rechargez la dernière version.")
                values = mutate(trip)
                # Compare-and-swap: a concurrent writer that got there first makes this match nothing.
                result = session.execute(
                    update(Trip).where(Trip.id == trip.id, Trip.revision == expected)
                    .values(**values, revision=expected + 1, updated_at=datetime.now(timezone.utc))
                    .execution_options(synchronize_session=False))
                if result.rowcount != 1:
                    raise _error(409, "revision_conflict",
                                 "Le voyage a changé pendant l’enregistrement. Rechargez la dernière version.")
            with sessions() as session:
                fresh = _serialize(session.get(Trip, str(trip_id)), "organizer")
        except SQLAlchemyError:
            raise HTTPException(503, "Sauvegarde indisponible.") from None
        response.headers["Cache-Control"] = "no-store"
        return fresh

    @app.get("/health")
    def health():
        return {"status": "ok", "generator": generator.name}

    @app.get("/ready")
    def ready():
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT id, revision, edit_token_hash FROM trips LIMIT 1"))
        except SQLAlchemyError:
            raise HTTPException(503, "Base indisponible ou migrations manquantes.") from None
        return {"status": "ready"}

    @app.post("/trips", status_code=201)
    def create_trip(request: TripRequest, response: Response):
        try:
            itinerary = Itinerary.model_validate_json(generator.generate(request))
            if [day.number for day in itinerary.days] != list(range(1, request.day_count + 1)):
                raise ValueError("Le programme ne respecte pas les dates.")
        except (ValidationError, ValueError):
            raise HTTPException(502, "Le générateur a renvoyé un programme invalide. Aucun voyage enregistré.") from None
        except TimeoutError:
            raise HTTPException(504, "Le générateur n’a pas répondu. Réessayez plus tard.") from None

        read_token, edit_token, hashes = new_secrets()
        trip = Trip(
            **hashes,
            preferences=request.model_dump(mode="json"),
            itinerary=StoredItinerary.model_validate(itinerary.model_dump()).model_dump(mode="json"),
            budget=unknown_budget(request.travelers, request.budget_cents),
            generator=generator.name,
        )
        return store(trip, response, read_token, edit_token)

    @app.post("/trips/example", status_code=201)
    def create_example(response: Response):
        prefs = TripRequest.model_validate(examples.PREFERENCES).model_dump(mode="json")
        read_token, edit_token, hashes = new_secrets()
        trip = Trip(
            **hashes, is_example=True, preferences=prefs,
            itinerary=StoredItinerary.model_validate(copy.deepcopy(examples.ITINERARY)).model_dump(mode="json"),
            budget_inputs={"lines": copy.deepcopy(examples.BUDGET_LINES)},
            budget=budget_from_lines(examples.BUDGET_LINES, prefs["travelers"], prefs["budget_cents"]),
            generator="exemple",
        )
        return store(trip, response, read_token, edit_token)

    @app.get("/trips/{trip_id}")
    def read_trip(trip_id: UUID, response: Response, authorization: str | None = Header(default=None)):
        token_hash = _bearer(authorization)
        try:
            with sessions() as session:
                trip = session.get(Trip, str(trip_id))
                result = _serialize(trip, _role(trip, token_hash))
        except SQLAlchemyError:
            raise HTTPException(503, "Lecture indisponible.") from None
        response.headers["Cache-Control"] = "no-store"
        return result

    @app.patch("/trips/{trip_id}/days/{day}/stops/{index}")
    def edit_stop(trip_id: UUID, day: int, index: int, body: StopUpdate, response: Response,
                  authorization: str | None = Header(default=None)):
        def mutate(trip):
            itinerary = StoredItinerary.model_validate(trip.itinerary)
            stop = _find_stop(itinerary, day, index)
            changes = {field: getattr(body, field) for field in ("name", "city", "description", "category")
                       if getattr(body, field) is not None and getattr(body, field) != getattr(stop, field)}
            if changes and stop.locked:
                raise _error(409, "locked", "Cette activité est verrouillée. Déverrouillez-la avant de la modifier.")
            if not changes and not body.review_done:
                raise _error(422, "no_change", "Aucune modification à appliquer.")
            for field, value in changes.items():
                setattr(stop, field, value)
            # A changed activity invalidates the costs and journeys planned around it.
            stop.needs_review = bool(changes) or (stop.needs_review and not body.review_done)
            return {"itinerary": itinerary.model_dump(mode="json")}
        return write(trip_id, authorization, body.expected_revision, mutate, response)

    @app.put("/trips/{trip_id}/days/{day}/stops/{index}/lock")
    def lock_stop(trip_id: UUID, day: int, index: int, body: LockUpdate, response: Response,
                  authorization: str | None = Header(default=None)):
        def mutate(trip):
            itinerary = StoredItinerary.model_validate(trip.itinerary)
            _find_stop(itinerary, day, index).locked = body.locked
            return {"itinerary": itinerary.model_dump(mode="json")}
        return write(trip_id, authorization, body.expected_revision, mutate, response)

    @app.put("/trips/{trip_id}/budget")
    def save_budget(trip_id: UUID, body: BudgetUpdate, response: Response,
                    authorization: str | None = Header(default=None)):
        def mutate(trip):
            lines = [line.model_dump() for line in body.lines]
            prefs = trip.preferences
            return {"budget_inputs": {"lines": lines},
                    "budget": budget_from_lines(lines, prefs["travelers"], prefs["budget_cents"])}
        return write(trip_id, authorization, body.expected_revision, mutate, response)

    return app


app = create_app()
