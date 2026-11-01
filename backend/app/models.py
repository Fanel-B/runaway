from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_token_hash: Mapped[str] = mapped_column(String(64))
    # NULL for trips created before editing existed: they stay read-only.
    edit_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    is_example: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    preferences: Mapped[dict] = mapped_column(JSON)
    itinerary: Mapped[dict] = mapped_column(JSON)
    budget: Mapped[dict] = mapped_column(JSON)
    budget_inputs: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    generator: Mapped[str] = mapped_column(String(30))
