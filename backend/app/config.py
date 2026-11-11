import os
from dataclasses import dataclass


def database_url() -> str:
    # Explicit fallback for a local demo, never presented as PostgreSQL.
    return os.environ.get("DATABASE_URL", "sqlite:///./runaway.db")


def parse_origins(raw: str) -> tuple[str, ...]:
    """Comma-separated list of exact origins. A wildcard is refused, not silently ignored."""
    origins = []
    for item in raw.split(","):
        origin = item.strip().rstrip("/")
        if not origin:
            continue
        if "*" in origin:
            raise ValueError("CORS_ORIGINS ne doit pas contenir « * » : listez les origines exactes.")
        if not origin.startswith(("http://", "https://")) or origin.count("/") != 2:
            raise ValueError(f"Origine CORS invalide : {origin!r} (attendu : https://domaine[:port], sans chemin).")
        origins.append(origin)
    return tuple(origins)


def _int(name: str, default: int, minimum: int = 1) -> int:
    value = int(os.environ.get(name, default))
    if value < minimum:
        raise ValueError(f"{name} doit valoir au moins {minimum}.")
    return value


@dataclass(frozen=True)
class Settings:
    # Empty by default: the Vite proxy serves the API on the same origin, no CORS needed.
    cors_origins: tuple[str, ...] = ()
    # Trip creations (POST /trips and POST /trips/example share the quota).
    creations_per_ip: int = 10
    creations_global: int = 200
    creation_window_seconds: int = 3600
    retention_months: int = 12
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            cors_origins=parse_origins(os.environ.get("CORS_ORIGINS", "")),
            creations_per_ip=_int("RATE_LIMIT_CREATIONS_PER_IP", cls.creations_per_ip),
            creations_global=_int("RATE_LIMIT_CREATIONS_GLOBAL", cls.creations_global),
            creation_window_seconds=_int("RATE_LIMIT_WINDOW_SECONDS", cls.creation_window_seconds),
            retention_months=_int("RETENTION_MONTHS", cls.retention_months),
            log_level=os.environ.get("LOG_LEVEL", cls.log_level).upper(),
        )
