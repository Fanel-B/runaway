import pytest
from app.budget import CostItem, calculate_budget


def test_common_and_individual_costs_and_single_margin():
    result = calculate_budget([CostItem("Chambre", 6000, 9000, 12000, True),
                               CostItem("Billet", 2000, 3000, 4000)], 3, 7000)
    assert result["scenarios"]["central"]["known_total_cents"] == 6480
    assert result["scenarios"]["central"]["within_budget"] is True
    assert result["scenarios"]["high"]["within_budget"] is False


def test_unknown_cost_never_means_affordable():
    result = calculate_budget([CostItem("Retour", None, None, None)], 3, 45000)
    for value in result["scenarios"].values():
        assert value["complete"] is False
        assert value["within_budget"] is None
        assert value["missing_items"] == ["Retour"]


def test_round_only_after_sum():
    items = [CostItem(str(i), 100, 100, 100, True) for i in range(3)]
    assert calculate_budget(items, 3, 1000)["scenarios"]["central"]["known_total_cents"] == 108


def test_group_total_rounds_once_from_unrounded_subtotal():
    result = calculate_budget([CostItem("Gîte", 10000, 10000, 10000, True)], 3, 5000)
    central = result["scenarios"]["central"]
    assert central["known_total_cents"] == 3600
    assert central["group_known_total_cents"] == 10800
    assert result["group_ceiling_cents"] == 15000


def test_explicit_zero_is_known_but_none_is_missing():
    result = calculate_budget([CostItem("Activités", 0, 0, 0), CostItem("Repas", None, 100, 100)], 1, 1000)
    assert result["scenarios"]["central"]["complete"] is True
    assert result["scenarios"]["low"]["missing_items"] == ["Repas"]


def test_empty_catalog_is_not_complete():
    assert calculate_budget([], 3, 45000)["scenarios"]["central"]["within_budget"] is None


@pytest.mark.parametrize("values", [(200, 100, 300), (-1, 100, 200), (1.5, 100, 200)])
def test_bad_estimates_rejected(values):
    with pytest.raises(ValueError): CostItem("test", *values)
