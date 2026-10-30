import hashlib
import json

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.main import create_app

LEGACY_TOKEN = "ancien-lien-de-lecture"


def test_legacy_trip_survives_and_stays_read_only(tmp_path, monkeypatch):
    # Always SQLite: this test needs a database it can rebuild from revision 0001.
    url = f"sqlite:///{tmp_path / 'legacy.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    config = Config("alembic.ini")
    command.upgrade(config, "0001")
    engine = create_engine(url)
    itinerary = {"title": "Ancien", "days": [{"number": 1, "title": "Jour 1", "stops": [
        {"name": "Temps libre", "city": "Nantes", "description": "V1", "category": "temps_libre"}]}]}
    prefs = {"departure": "paris", "destination": "Nantes", "start_date": "2027-01-01",
             "end_date": "2027-01-01", "travelers": 2, "budget_cents": 20000, "style": "culture"}
    with engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO trips (id, created_at, read_token_hash, preferences, itinerary, budget, generator) "
            "VALUES (:id, '2026-10-01 10:00:00', :hash, :prefs, :itinerary, '{}', 'fake')"),
            {"id": "11111111-1111-1111-1111-111111111111",
             "hash": hashlib.sha256(LEGACY_TOKEN.encode()).hexdigest(),
             "prefs": json.dumps(prefs), "itinerary": json.dumps(itinerary)})
    engine.dispose()

    command.upgrade(config, "head")
    with TestClient(create_app(url)) as client:
        path = "/trips/11111111-1111-1111-1111-111111111111"
        data = client.get(path, headers={"Authorization": f"Bearer {LEGACY_TOKEN}"}).json()
        assert data["role"] == "reader" and data["editable"] is False and data["revision"] == 1
        assert data["itinerary"]["days"][0]["stops"][0]["locked"] is False
        assert data["budget"]["scenarios"]["central"]["within_budget"] is None
        refused = client.patch(f"{path}/days/1/stops/0", json={"expected_revision": 1, "name": "x"},
                               headers={"Authorization": f"Bearer {LEGACY_TOKEN}"})
        assert refused.status_code == 403

    command.downgrade(config, "0001")
    command.upgrade(config, "head")
