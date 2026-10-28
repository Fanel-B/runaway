import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.main import create_app
from app.models import Trip


def test_health_and_migrated_database(client):
    assert client.get("/health").json() == {"status": "ok", "generator": "fake"}
    assert client.get("/ready").status_code == 200


def test_trip_persists_and_requires_secret(client, payload):
    created = client.post("/trips", json=payload)
    assert created.status_code == 201
    data = created.json()
    path = f"/trips/{data['id']}"
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization": "Bearer wrong"}).status_code == 404
    result = client.get(path, headers={"Authorization": f"Bearer {data['read_token']}"})
    assert result.status_code == 200
    assert result.headers["cache-control"] == "no-store"
    assert len(result.json()["itinerary"]["days"]) == 3
    assert result.json()["generator"] == "fake"
    assert result.json()["budget"]["scenarios"]["central"]["within_budget"] is None
    assert "read_token" not in result.text
    # Read through a new app/session, not an in-memory result cache.
    with TestClient(create_app(client.app.state.engine.url.render_as_string(hide_password=False))) as second:
        assert second.get(path, headers={"Authorization": f"Bearer {data['read_token']}"}).status_code == 200


@pytest.mark.parametrize("patch", [
    {"departure": "lyon"}, {"end_date": "2027-06-11"}, {"end_date": "2027-07-10"},
    {"travelers": 0}, {"travelers": True}, {"budget_cents": -1}, {"destination": "  "},
    {"model": "user-selected-model"},
])
def test_invalid_preferences_rejected(client, payload, patch):
    assert client.post("/trips", json={**payload, **patch}).status_code == 422


@pytest.mark.parametrize("raw", ["not json", '{"title":"bad","days":[]}', json.dumps({
    "title": "wrong duration", "days": [{"number": 1, "title": "Only one", "stops": [
        {"name": "Free time", "city": "Paris", "description": "test", "category": "temps_libre"}]}]})])
def test_invalid_generator_never_saved(client, payload, raw):
    class BadLLM:
        name = "bad"
        def generate(self, request): return raw
    engine = client.app.state.engine
    with Session(engine) as session:
        before = session.scalar(select(func.count()).select_from(Trip))
    with TestClient(create_app(engine.url.render_as_string(hide_password=False), BadLLM())) as broken:
        assert broken.post("/trips", json=payload).status_code == 502
    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Trip)) == before


def test_provider_timeout_is_explained(client, payload):
    class SlowLLM:
        name = "slow"
        def generate(self, request): raise TimeoutError()
    with TestClient(create_app(client.app.state.engine.url.render_as_string(hide_password=False), SlowLLM())) as slow:
        assert slow.post("/trips", json=payload).status_code == 504
