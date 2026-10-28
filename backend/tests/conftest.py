import os

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    # CI may exercise PostgreSQL; local tests use an isolated migrated SQLite DB.
    url = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("DATABASE_URL", url)
    command.upgrade(Config("alembic.ini"), "head")
    app = create_app(url)
    with TestClient(app) as client:
        yield client


@pytest.fixture
def payload():
    return {"departure": "paris", "destination": "Normandie", "start_date": "2027-06-12",
            "end_date": "2027-06-14", "travelers": 3, "budget_cents": 45000, "style": "nature"}
