"""Last opening date, used by the retention purge.

Existing trips get the migration date, not their creation date: an old trip
gets a full retention period from today instead of becoming purgeable at once.
"""
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("trips", sa.Column("last_opened_at", sa.DateTime(timezone=True), nullable=True))
    trips = sa.table("trips", sa.column("last_opened_at", sa.DateTime(timezone=True)))
    op.execute(trips.update().values(last_opened_at=datetime.now(timezone.utc)))
    op.create_index("ix_trips_last_opened_at", "trips", ["last_opened_at"])


def downgrade():
    op.drop_index("ix_trips_last_opened_at", table_name="trips")
    with op.batch_alter_table("trips") as batch:
        batch.drop_column("last_opened_at")
