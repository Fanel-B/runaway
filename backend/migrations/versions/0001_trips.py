"""Persist validated trips and hashed read tokens."""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "trips",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_token_hash", sa.String(64), nullable=False),
        sa.Column("preferences", sa.JSON(), nullable=False),
        sa.Column("itinerary", sa.JSON(), nullable=False),
        sa.Column("budget", sa.JSON(), nullable=False),
        sa.Column("generator", sa.String(30), nullable=False),
    )


def downgrade():
    op.drop_table("trips")
