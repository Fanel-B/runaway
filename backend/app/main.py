import hashlib
import hmac
import os
import secrets
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.budget import unknown_budget
from app.config import database_url
from app.db import make_database
from app.llm import FakeLLM, LLMClient
from app.models import Trip
from app.schemas import Itinerary, TripRequest


def create_app(url: str | None = None, llm: LLMClient | None = None) -> FastAPI:
    if llm is None and os.getenv("LLM_PROVIDER", "fake") != "fake":
        raise RuntimeError("Seul LLM_PROVIDER=fake est disponible dans cette tranche.")
    engine, sessions = make_database(url or database_url())
    generator = llm or FakeLLM()

    @asynccontextmanager
    async def lifespan(app):
        yield
        engine.dispose()

    app = FastAPI(title="Runaway", version="0.1.0", lifespan=lifespan)
    app.state.engine = engine

    @app.get("/health")
    def health():
        return {"status": "ok", "generator": generator.name}

    @app.get("/ready")
    def ready():
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT id FROM trips LIMIT 1"))
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

        token = secrets.token_urlsafe(32)
        trip = Trip(
            read_token_hash=hashlib.sha256(token.encode()).hexdigest(),
            preferences=request.model_dump(mode="json"),
            itinerary=itinerary.model_dump(mode="json"),
            budget=unknown_budget(request.travelers, request.budget_cents),
            generator=generator.name,
        )
        try:
            with sessions.begin() as session:
                session.add(trip)
                session.flush()
                trip_id = trip.id
        except SQLAlchemyError:
            raise HTTPException(503, "Sauvegarde indisponible. Vérifiez la base et ses migrations.") from None
        response.headers["Cache-Control"] = "no-store"
        return {"id": trip_id, "read_token": token, "generator": generator.name}

    @app.get("/trips/{trip_id}")
    def read_trip(trip_id: UUID, response: Response, authorization: str | None = Header(default=None)):
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(401, "Lien ou jeton de lecture requis.")
        token_hash = hashlib.sha256(authorization[7:].encode()).hexdigest()
        try:
            with sessions() as session:
                trip = session.get(Trip, str(trip_id))
                if trip is None or not hmac.compare_digest(trip.read_token_hash, token_hash):
                    raise HTTPException(404, "Voyage introuvable.")
                result = {"id": trip.id, "created_at": trip.created_at,
                          "preferences": trip.preferences, "itinerary": trip.itinerary,
                          "budget": trip.budget, "generator": trip.generator,
                          "place_verification": "not_implemented"}
        except SQLAlchemyError:
            raise HTTPException(503, "Lecture indisponible.") from None
        response.headers["Cache-Control"] = "no-store"
        return result

    return app


app = create_app()
