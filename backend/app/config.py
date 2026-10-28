import os


def database_url() -> str:
    # Explicit fallback for a local demo, never presented as PostgreSQL.
    return os.environ.get("DATABASE_URL", "sqlite:///./runaway.db")
