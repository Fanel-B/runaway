import os

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

# Functional tests create many trips: the creation quota is tested on its own, with small limits.
ROOMY = Settings(creations_per_ip=10_000, creations_global=10_000)


@pytest.fixture
def database_url(tmp_path, monkeypatch):
    # CI may exercise PostgreSQL; local tests use an isolated migrated SQLite DB.
    url = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("DATABASE_URL", url)
    command.upgrade(Config("alembic.ini"), "head")
    return url


@pytest.fixture
def make_client(database_url):
    clients = []

    def make(settings: Settings = ROOMY, **kwargs) -> TestClient:
        client = TestClient(create_app(database_url, settings=settings, **kwargs))
        clients.append(client.__enter__())
        return client
    yield make
    for client in clients:
        client.__exit__(None, None, None)


@pytest.fixture
def client(make_client):
    return make_client()


@pytest.fixture
def payload():
    return {"departure": "paris", "destination": "Normandie", "start_date": "2027-06-12",
            "end_date": "2027-06-14", "travelers": 3, "budget_cents": 45000, "style": "nature"}


def auth(token):
    return {"Authorization": f"Bearer {token}"}
