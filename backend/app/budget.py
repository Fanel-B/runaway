from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True)
class CostItem:
    """Scenario totals in cents, either for the group or per traveler."""

    name: str
    low: int | None
    central: int | None
    high: int | None
    shared: bool = False

    def __post_init__(self):
        values = (self.low, self.central, self.high)
        if any(v is not None and (type(v) is not int or v < 0) for v in values):
            raise ValueError("Les coûts sont des centimes entiers positifs ou inconnus.")
        known = [v for v in values if v is not None]
        if known != sorted(known):
            raise ValueError("Les scénarios doivent être ordonnés.")


def calculate_budget(items: list[CostItem], travelers: int, ceiling_cents: int) -> dict:
    if type(travelers) is not int or travelers < 1:
        raise ValueError("Au moins un voyageur est requis.")
    if type(ceiling_cents) is not int or ceiling_cents < 0:
        raise ValueError("Plafond invalide.")
    scenarios = {}
    for scenario in ("low", "central", "high"):
        subtotal = Decimal(0)
        missing = []
        for item in items:
            amount = getattr(item, scenario)
            if amount is None:
                missing.append(item.name)
            else:
                subtotal += Decimal(amount) / travelers if item.shared else Decimal(amount)
        # Round once at the end; never lose cents during each division.
        total = int((subtotal * Decimal("1.08")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        complete = bool(items) and not missing
        scenarios[scenario] = {
            "known_total_cents": total,
            "complete": complete,
            "missing_items": missing,
            "within_budget": total <= ceiling_cents if complete else None,
        }
    return {"currency": "EUR", "margin_percent": 8, "per_person": True, "scenarios": scenarios}


def unknown_budget(travelers: int, ceiling_cents: int) -> dict:
    # No historical AI-generated prices are silently imported as real estimates.
    items = [CostItem(name, None, None, None) for name in
             ("Transport", "Hébergement", "Repas", "Activités", "Frais annexes")]
    return calculate_budget(items, travelers, ceiling_cents)
