from decimal import Decimal

from shreenivas_sons.utils.money import money_to_paise, paise_to_money


def test_money_round_trip():
    assert money_to_paise("123.45") == 12345
    assert paise_to_money(12345) == Decimal("123.45")


def test_money_handles_rounding():
    assert money_to_paise("1.235") == 124
