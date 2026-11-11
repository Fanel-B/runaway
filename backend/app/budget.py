from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

BUDGET_POSTS = {
    "transport": "Transport",
    "hebergement": "Hébergement",
    "repas": "Repas",
    "activites": "Activités",
    "annexes": "Frais annexes",
}
MARGIN = Decimal("1.08")


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


def _round(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


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
        # Margin applied once, rounding only at the very end of each figure.
        total = _round(subtotal * MARGIN)
        complete = bool(items) and not missing
        scenarios[scenario] = {
            "known_total_cents": total,
            "group_known_total_cents": _round(subtotal * travelers * MARGIN),
            "complete": complete,
            "missing_items": missing,
            "within_budget": total <= ceiling_cents if complete else None,
        }
    return {"currency": "EUR", "margin_percent": 8, "per_person": True, "travelers": travelers,
            "ceiling_cents": ceiling_cents, "group_ceiling_cents": ceiling_cents * travelers,
            "scenarios": scenarios}


def normalize_lines(lines: list[dict] | None) -> list[dict]:
    by_key = {line["key"]: line for line in lines or []}
    return [{"key": key, "label": label,
             "low": by_key.get(key, {}).get("low"),
             "central": by_key.get(key, {}).get("central"),
             "high": by_key.get(key, {}).get("high"),
             "shared": bool(by_key.get(key, {}).get("shared", False))}
            for key, label in BUDGET_POSTS.items()]


def budget_from_lines(lines: list[dict] | None, travelers: int, ceiling_cents: int) -> dict:
    items = [CostItem(line["label"], line["low"], line["central"], line["high"], line["shared"])
             for line in normalize_lines(lines)]
    return calculate_budget(items, travelers, ceiling_cents)


def unknown_budget(travelers: int, ceiling_cents: int) -> dict:
    # No historical AI-generated prices are silently imported as real estimates.
    return budget_from_lines(None, travelers, ceiling_cents)
