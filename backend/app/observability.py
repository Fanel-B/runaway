"""Structured JSON logs with a request id.

What is logged: method, path (never the query string), status, duration and
the request id. Headers, bodies and client addresses are never logged.
A last redaction pass masks anything that looks like a secret or a hash.
"""
import json
import logging
import re
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone

request_id: ContextVar[str | None] = ContextVar("request_id", default=None)

_INCOMING_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")
_SECRETS = [
    (re.compile(r"Bearer\s+\S+", re.IGNORECASE), "Bearer [masqué]"),
    # Read and edit secrets are 43 url-safe characters, hashes 64 hex digits: any long run is masked.
    (re.compile(r"[A-Za-z0-9_-]{40,}"), "[masqué]"),
]
_STANDARD = set(vars(logging.makeLogRecord({}))) | {"message", "asctime", "color_message"}


def redact(text: str) -> str:
    for pattern, replacement in _SECRETS:
        text = pattern.sub(replacement, text)
    return text


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "time": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id.get(),
        }
        entry.update({key: value for key, value in vars(record).items() if key not in _STANDARD})
        if record.exc_info:
            entry["error"] = self.formatException(record.exc_info)
        return redact(json.dumps(entry, ensure_ascii=False, default=str))


_configured = False


def configure_logging(level: str = "INFO") -> None:
    """Route the app and uvicorn logs through one JSON handler on stderr."""
    global _configured
    if _configured:
        return
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    for name in ("uvicorn", "uvicorn.error"):
        logger = logging.getLogger(name)
        logger.handlers = []
        logger.propagate = True
    # Replaced by our own request log, which has the request id and no query string.
    logging.getLogger("uvicorn.access").disabled = True
    _configured = True


log = logging.getLogger("runaway")


def install_request_logging(app) -> None:
    @app.middleware("http")
    async def request_logging(request, call_next):
        incoming = request.headers.get("x-request-id", "")
        current = incoming if _INCOMING_ID.match(incoming) else uuid.uuid4().hex
        token = request_id.set(current)
        started = time.perf_counter()
        fields = {"method": request.method, "path": request.url.path}
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = current
            log.info("request", extra={**fields, "status": response.status_code, "duration_ms": _elapsed(started)})
            return response
        except Exception:
            log.exception("request_failed", extra={**fields, "duration_ms": _elapsed(started)})
            raise
        finally:
            request_id.reset(token)


def _elapsed(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 1)
