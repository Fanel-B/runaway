import hashlib
import io
import json
import logging

import pytest

from app.config import Settings, parse_origins
from app.observability import JsonFormatter, redact
from app.ratelimit import RateLimited, SlidingWindowLimiter


def auth(token):
    return {"Authorization": f"Bearer {token}"}

ALLOWED = "https://runaway.example"
PREFLIGHT = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"}


# ---------- CORS ----------

def test_unknown_origin_is_refused(make_client):
    client = make_client(Settings(cors_origins=(ALLOWED,)))
    preflight = client.options("/trips", headers={"Origin": "https://pirate.example", **PREFLIGHT})
    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers
    # A simple request still runs server side, but the browser gets no permission to read it.
    simple = client.get("/health", headers={"Origin": "https://pirate.example"})
    assert "access-control-allow-origin" not in simple.headers


def test_listed_origin_is_allowed_exactly(make_client):
    client = make_client(Settings(cors_origins=(ALLOWED,)))
    preflight = client.options("/trips", headers={"Origin": ALLOWED, **PREFLIGHT})
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == ALLOWED
    assert "access-control-allow-credentials" not in preflight.headers
    delete = client.options("/trips/x", headers={"Origin": ALLOWED, "Access-Control-Request-Method": "DELETE"})
    assert delete.status_code == 200


def test_no_cross_origin_by_default(client):
    preflight = client.options("/trips", headers={"Origin": "http://localhost:5173", **PREFLIGHT})
    assert preflight.status_code == 400


@pytest.mark.parametrize("raw", ["*", "https://*.example", "runaway.example", "https://runaway.example/app"])
def test_wildcards_and_malformed_origins_are_rejected(raw):
    with pytest.raises(ValueError):
        parse_origins(raw)


def test_origins_are_read_from_the_environment(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", " https://a.example/ , http://localhost:5173,,")
    assert Settings.from_env().cors_origins == ("https://a.example", "http://localhost:5173")
    monkeypatch.setenv("CORS_ORIGINS", "*")
    with pytest.raises(ValueError):
        Settings.from_env()


# ---------- Rate limit ----------

class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def limited_client(make_client, per_ip=2, global_limit=100, **kwargs):
    client = make_client(Settings(creations_per_ip=per_ip, creations_global=global_limit,
                                  creation_window_seconds=3600), **kwargs)
    clock = Clock()
    client.app.state.limiter.clock = clock
    return client, clock


def test_creations_are_limited_per_client(make_client, payload):
    client, clock = limited_client(make_client)
    assert client.post("/trips/example").status_code == 201
    assert client.post("/trips", json=payload).status_code == 201
    # Both routes share the same quota.
    for refused in (client.post("/trips/example"), client.post("/trips", json=payload)):
        assert refused.status_code == 429
        assert refused.json()["detail"]["code"] == "rate_limited"
        assert 1 <= int(refused.headers["retry-after"]) <= 3601
    clock.now += 3601
    assert client.post("/trips/example").status_code == 201


def test_invalid_requests_do_not_use_the_quota(make_client, payload):
    client, _ = limited_client(make_client, per_ip=1)
    assert client.post("/trips", json={**payload, "travelers": 99}).status_code == 422
    assert client.post("/trips", json=payload).status_code == 201


class BrokenLLM:
    name = "broken"

    def generate(self, request):
        return "{}"


def test_failed_creations_do_not_use_the_quota(make_client, payload):
    client, _ = limited_client(make_client, per_ip=1, llm=BrokenLLM())
    assert client.post("/trips", json=payload).status_code == 502
    assert client.post("/trips/example").status_code == 201


def test_global_limit_and_release():
    clock = Clock()
    limiter = SlidingWindowLimiter(per_key=5, global_limit=2, window_seconds=60, clock=clock)
    limiter.acquire("a")
    release = limiter.acquire("b")
    with pytest.raises(RateLimited) as error:
        limiter.acquire("c")
    assert error.value.scope == "global"
    release()
    limiter.acquire("c")
    clock.now += 61
    limiter.acquire("d")


# ---------- Logs ----------

@pytest.fixture
def captured_logs():
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("runaway")
    logger.addHandler(handler)
    previous = logger.level
    logger.setLevel(logging.INFO)
    yield stream
    logger.removeHandler(handler)
    logger.setLevel(previous)


def test_logs_are_json_with_request_id_and_no_secret(client, payload, captured_logs):
    created = client.post("/trips", json=payload, headers={"X-Request-ID": "essai-nuit-0001"})
    assert created.headers["x-request-id"] == "essai-nuit-0001"
    trip = created.json()
    read, edit = trip["read_token"], trip["edit_token"]
    path = f"/trips/{trip['id']}"
    client.get(path, headers=auth(read))
    client.get(path, headers=auth(edit))
    client.get(path, headers=auth("mauvaise-cle"))
    client.patch(f"{path}/days/1/stops/0", headers=auth(edit), json={"expected_revision": 1, "name": "Phare"})
    client.delete(path, headers=auth(read))
    client.delete(path, headers=auth(edit))

    output = captured_logs.getvalue()
    lines = [json.loads(line) for line in output.splitlines()]
    requests = [line for line in lines if line["message"] == "request"]
    assert len(requests) == 7
    assert requests[0]["request_id"] == "essai-nuit-0001"
    assert all(line["request_id"] and line["status"] and "duration_ms" in line for line in requests)
    assert len({line["request_id"] for line in requests}) == 7
    for secret in (read, edit, hashlib.sha256(read.encode()).hexdigest(), hashlib.sha256(edit.encode()).hexdigest()):
        assert secret not in output
    assert "Bearer" not in output and "authorization" not in output.lower()


def test_unsafe_incoming_request_id_is_replaced(client):
    response = client.get("/health", headers={"X-Request-ID": "pas un id\nfiable"})
    assert response.headers["x-request-id"] != "pas un id\nfiable"
    assert len(response.headers["x-request-id"]) == 32


def test_redaction_masks_anything_secret_looking():
    digest = hashlib.sha256(b"x").hexdigest()
    text = redact(f"Authorization: Bearer abc.def token=Zm9vYmFyYmF6cXV4cXV1eGNvcmdlZ3JhdWx0Z2FycGx5 hash={digest}")
    assert "abc.def" not in text and digest not in text and "Zm9vYmFy" not in text
    assert redact("/trips/11111111-1111-1111-1111-111111111111") == "/trips/11111111-1111-1111-1111-111111111111"
