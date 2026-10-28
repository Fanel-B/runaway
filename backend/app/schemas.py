from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class TripRequest(StrictModel):
    departure: Literal["paris", "toulouse"]
    destination: str = Field(min_length=2, max_length=100)
    start_date: date
    end_date: date
    travelers: int = Field(ge=1, le=8, strict=True)
    budget_cents: int = Field(ge=100, le=1_000_000, strict=True)
    style: Literal["nature", "culture", "plage", "equilibre"] = "equilibre"

    @model_validator(mode="after")
    def valid_dates(self):
        if not 0 <= (self.end_date - self.start_date).days <= 13:
            raise ValueError("Le voyage doit durer entre 1 et 14 jours, dates incluses.")
        return self

    @property
    def day_count(self) -> int:
        return (self.end_date - self.start_date).days + 1


class Stop(StrictModel):
    name: str = Field(min_length=1, max_length=150)
    city: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=500)
    category: Literal["visite", "activite", "temps_libre"]
    # A model cannot assert verification or supply invented coordinates.


class Day(StrictModel):
    number: int = Field(ge=1, le=14, strict=True)
    title: str = Field(min_length=1, max_length=150)
    stops: list[Stop] = Field(min_length=1, max_length=6)


class Itinerary(StrictModel):
    title: str = Field(min_length=1, max_length=150)
    days: list[Day] = Field(min_length=1, max_length=14)
