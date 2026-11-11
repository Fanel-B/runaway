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


def test_existing_trips_get_a_full_retention_period(tmp_path, monkeypatch):
    # From 0002 to 0003: old trips are dated from the migration, not from their creation.
    from datetime import datetime, timedelta, timezone

    from app.retention import purge_inactive_trips

    url = f"sqlite:///{tmp_path / 'retention.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    config = Config("alembic.ini")
    command.upgrade(config, "0002")
    engine = create_engine(url)
    prefs = {"departure": "paris", "destination": "Lille", "start_date": "2024-01-01",
             "end_date": "2024-01-02", "travelers": 2, "budget_cents": 20000, "style": "culture"}
    itinerary = {"title": "Vieux", "days": [{"number": d, "title": f"Jour {d}", "stops": []} for d in (1, 2)]}
    with engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO trips (id, created_at, read_token_hash, preferences, itinerary, budget, generator) "
            "VALUES (:id, '2023-01-01 10:00:00', :hash, :prefs, :itinerary, '{}', 'fake')"),
            {"id": "22222222-2222-2222-2222-222222222222", "hash": "0" * 64,
             "prefs": json.dumps(prefs), "itinerary": json.dumps(itinerary)})

    before = datetime.now(timezone.utc) - timedelta(minutes=1)
    command.upgrade(config, "head")
    with engine.connect() as connection:
        opened = connection.execute(text("SELECT last_opened_at FROM trips")).scalar_one()
    assert opened is not None and opened >= before.strftime("%Y-%m-%d %H:%M:%S")
    assert purge_inactive_trips(engine, 12, apply=True)["trips"] == 0

    command.downgrade(config, "0002")
    with engine.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM trips")).scalar_one() == 1
    command.upgrade(config, "head")
    engine.dispose()
