"""Separate edit secret, revision counter, example flag and budget inputs.

Existing trips keep their read link. They get no edit secret, so an old read
link can never become an edit right.
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("trips", sa.Column("edit_token_hash", sa.String(64), nullable=True))
    op.add_column("trips", sa.Column("revision", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("trips", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("trips", sa.Column("is_example", sa.Boolean(), nullable=False, server_default="0"))
    op.add_column("trips", sa.Column("budget_inputs", sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table("trips") as batch:
        for column in ("budget_inputs", "is_example", "updated_at", "revision", "edit_token_hash"):
            batch.drop_column(column)
