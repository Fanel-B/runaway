"""Retention: a trip nobody has opened for N months can be purged.

Not scheduled anywhere yet. Run it by hand, from the backend folder:

    python -m app.retention              # dry run: counts, deletes nothing
    python -m app.retention --apply      # deletes for real
    python -m app.retention --months 6   # other retention than RETENTION_MONTHS
"""
import argparse
import calendar
import json
from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.engine import Engine

from app.config import Settings, database_url
from app.db import make_database
from app.models import Trip


def months_before(moment: datetime, months: int) -> datetime:
    """Same day and time `months` calendar months earlier, clamped to the month's last day."""
    years, month_index = divmod(moment.month - 1 - months, 12)
    year, month = moment.year + years, month_index + 1
    day = min(moment.day, calendar.monthrange(year, month)[1])
    return moment.replace(year=year, month=month, day=day)


def purge_inactive_trips(engine: Engine, months: int, now: datetime | None = None, apply: bool = False) -> dict:
    """Delete (or with apply=False only count) trips last opened before the cutoff.

    A trip without a last opening date is kept: when in doubt, nothing is deleted.
    """
    if months < 1:
        raise ValueError("La durée de conservation doit être d’au moins un mois.")
    cutoff = months_before(now or datetime.now(timezone.utc), months)
    stale = Trip.last_opened_at.is_not(None) & (Trip.last_opened_at < cutoff)
    with engine.begin() as connection:
        if apply:
            count = connection.execute(delete(Trip).where(stale)).rowcount
        else:
            count = connection.execute(select(func.count()).select_from(Trip).where(stale)).scalar_one()
    return {"cutoff": cutoff.isoformat(), "months": months, "applied": apply, "trips": count}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Purge des voyages non ouverts depuis N mois.")
    parser.add_argument("--months", type=int, default=Settings.from_env().retention_months)
    parser.add_argument("--apply", action="store_true", help="supprimer réellement (sinon : simple comptage)")
    args = parser.parse_args(argv)
    engine, _ = make_database(database_url())
    try:
        print(json.dumps(purge_inactive_trips(engine, args.months, apply=args.apply), ensure_ascii=False))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
