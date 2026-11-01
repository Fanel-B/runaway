from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select, update

from app.models import Trip
from app.retention import months_before, purge_inactive_trips


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def trip(client, payload):
    return client.post("/trips", json=payload).json()


def set_last_opened(client, trip_id, value):
    with client.app.state.engine.begin() as connection:
        connection.execute(update(Trip).where(Trip.id == trip_id).values(last_opened_at=value))


def last_opened(client, trip_id):
    with client.app.state.engine.connect() as connection:
        return connection.execute(select(Trip.last_opened_at, Trip.revision).where(Trip.id == trip_id)).one()


def exists(client, trip_id):
    with client.app.state.engine.connect() as connection:
        return connection.execute(select(Trip.id).where(Trip.id == trip_id)).first() is not None


# ---------- Deletion ----------

def test_only_the_organizer_can_delete(client, trip):
    path = f"/trips/{trip['id']}"
    reader = client.delete(path, headers=auth(trip["read_token"]))
    assert reader.status_code == 403 and reader.json()["detail"]["code"] == "read_only"
    assert client.delete(path).status_code == 401
    assert client.delete(path, headers=auth("mauvaise-cle")).status_code == 404
    assert client.delete("/trips/00000000-0000-0000-0000-000000000000",
                         headers=auth(trip["edit_token"])).status_code == 404
    assert exists(client, trip["id"])

    deleted = client.delete(path, headers=auth(trip["edit_token"]))
    assert deleted.status_code == 204 and deleted.content == b""
    assert not exists(client, trip["id"])
    # Afterwards both secrets get the same 404 as an unknown trip.
    for token in (trip["read_token"], trip["edit_token"]):
        assert client.get(path, headers=auth(token)).status_code == 404
    assert client.delete(path, headers=auth(trip["edit_token"])).status_code == 404


def test_deleting_one_trip_leaves_the_others(client, payload):
    first, second = (client.post("/trips", json=payload).json() for _ in range(2))
    assert client.delete(f"/trips/{first['id']}", headers=auth(first["edit_token"])).status_code == 204
    assert client.get(f"/trips/{second['id']}", headers=auth(second["read_token"])).status_code == 200


# ---------- Last opening ----------

def test_creation_sets_last_opened(client, trip):
    opened, _ = last_opened(client, trip["id"])
    assert opened is not None


def test_reading_refreshes_last_opened_without_new_revision(client, trip):
    old = datetime(2025, 1, 1, tzinfo=timezone.utc)
    set_last_opened(client, trip["id"], old)
    data = client.get(f"/trips/{trip['id']}", headers=auth(trip["read_token"])).json()
    assert data["retention_months"] == 12
    opened, revision = last_opened(client, trip["id"])
    assert opened.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc) - timedelta(minutes=5)
    assert revision == 1
    # A second read the same day does not write again.
    client.get(f"/trips/{trip['id']}", headers=auth(trip["read_token"]))
    assert last_opened(client, trip["id"])[0] == opened


def test_wrong_secret_does_not_refresh_last_opened(client, trip):
    old = datetime(2025, 1, 1, tzinfo=timezone.utc)
    set_last_opened(client, trip["id"], old)
    assert client.get(f"/trips/{trip['id']}", headers=auth("mauvaise-cle")).status_code == 404
    assert last_opened(client, trip["id"])[0].replace(tzinfo=timezone.utc) == old


# ---------- Purge ----------

@pytest.mark.parametrize("moment, months, expected", [
    (datetime(2026, 10, 31, 3, 0), 12, datetime(2025, 10, 31, 3, 0)),
    (datetime(2026, 3, 31), 1, datetime(2026, 2, 28)),
    (datetime(2028, 3, 31), 1, datetime(2028, 2, 29)),
    (datetime(2026, 1, 15), 1, datetime(2025, 12, 15)),
    (datetime(2026, 1, 15), 25, datetime(2023, 12, 15)),
])
def test_months_before(moment, months, expected):
    assert months_before(moment, months) == expected


def test_purge_removes_only_trips_unopened_for_too_long(client, payload):
    now = datetime(2027, 6, 1, tzinfo=timezone.utc)
    old, recent, unknown = (client.post("/trips", json=payload).json()["id"] for _ in range(3))
    set_last_opened(client, old, datetime(2026, 5, 31, tzinfo=timezone.utc))
    set_last_opened(client, recent, datetime(2026, 6, 2, tzinfo=timezone.utc))
    set_last_opened(client, unknown, None)
    engine = client.app.state.engine

    dry = purge_inactive_trips(engine, 12, now=now)
    assert dry["applied"] is False and dry["trips"] >= 1
    assert exists(client, old)

    done = purge_inactive_trips(engine, 12, now=now, apply=True)
    assert done["applied"] is True and done["trips"] >= 1
    assert not exists(client, old)
    assert exists(client, recent) and exists(client, unknown)


def test_purge_refuses_a_zero_retention(client):
    with pytest.raises(ValueError):
        purge_inactive_trips(client.app.state.engine, 0)
