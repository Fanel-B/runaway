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


def test_empty_catalog_is_not_complete():
    assert calculate_budget([], 3, 45000)["scenarios"]["central"]["within_budget"] is None


@pytest.mark.parametrize("values", [(200, 100, 300), (-1, 100, 200), (1.5, 100, 200)])
def test_bad_estimates_rejected(values):
    with pytest.raises(ValueError): CostItem("test", *values)
