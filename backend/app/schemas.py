from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Category = Literal["visite", "activite", "temps_libre", "repas", "trajet"]
Moment = Literal["matin", "midi", "apres_midi", "soir"]
BudgetKey = Literal["transport", "hebergement", "repas", "activites", "annexes"]


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
    category: Category
    # A moment of the day, never an invented hour.
    moment: Moment | None = None
    # A model cannot assert verification or supply invented coordinates.


class Day(StrictModel):
    number: int = Field(ge=1, le=14, strict=True)
    title: str = Field(min_length=1, max_length=150)
    stops: list[Stop] = Field(min_length=1, max_length=6)


class Itinerary(StrictModel):
    title: str = Field(min_length=1, max_length=150)
    days: list[Day] = Field(min_length=1, max_length=14)


class StoredStop(Stop):
    locked: bool = False
    needs_review: bool = False


class StoredDay(StrictModel):
    number: int = Field(ge=1, le=14, strict=True)
    title: str = Field(min_length=1, max_length=150)
    stops: list[StoredStop] = Field(min_length=1, max_length=6)


class StoredItinerary(StrictModel):
    title: str = Field(min_length=1, max_length=150)
    days: list[StoredDay] = Field(min_length=1, max_length=14)


class StopUpdate(StrictModel):
    expected_revision: int = Field(ge=1, strict=True)
    name: str | None = Field(default=None, min_length=1, max_length=150)
    city: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    category: Category | None = None
    review_done: bool = False


class LockUpdate(StrictModel):
    expected_revision: int = Field(ge=1, strict=True)
    locked: bool


Cents = int | None


class BudgetLine(StrictModel):
    key: BudgetKey
    low: Cents = Field(default=None, ge=0, le=10_000_000, strict=True)
    central: Cents = Field(default=None, ge=0, le=10_000_000, strict=True)
    high: Cents = Field(default=None, ge=0, le=10_000_000, strict=True)
    shared: bool = False

    @model_validator(mode="after")
    def ordered(self):
        known = [v for v in (self.low, self.central, self.high) if v is not None]
        if known != sorted(known):
            raise ValueError("Les montants doivent respecter bas ≤ central ≤ haut.")
        return self


class BudgetUpdate(StrictModel):
    expected_revision: int = Field(ge=1, strict=True)
    lines: list[BudgetLine] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def unique_keys(self):
        keys = [line.key for line in self.lines]
        if len(keys) != len(set(keys)):
            raise ValueError("Chaque poste ne peut apparaître qu’une fois.")
        return self
