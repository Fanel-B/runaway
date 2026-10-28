from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    read_token_hash: Mapped[str] = mapped_column(String(64))
    preferences: Mapped[dict] = mapped_column(JSON)
    itinerary: Mapped[dict] = mapped_column(JSON)
    budget: Mapped[dict] = mapped_column(JSON)
    generator: Mapped[str] = mapped_column(String(30))
