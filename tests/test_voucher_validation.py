import pytest

from shreenivas_sons.services.accounting import validate_voucher_rows


def test_rejects_unbalanced_voucher_rows():
    rows = [
        {"ledger_id": 1, "debit_paise": 1000, "credit_paise": 0},
        {"ledger_id": 2, "debit_paise": 0, "credit_paise": 900},
    ]

    with pytest.raises(ValueError, match="debit and credit totals do not match"):
        validate_voucher_rows(rows)


def test_rejects_voucher_with_one_row():
    rows = [{"ledger_id": 1, "debit_paise": 1000, "credit_paise": 0}]

    with pytest.raises(ValueError, match="At least two ledger entries are required"):
        validate_voucher_rows(rows)


def test_rejects_zero_amount_rows():
    rows = [
        {"ledger_id": 1, "debit_paise": 0, "credit_paise": 0},
        {"ledger_id": 2, "debit_paise": 1000, "credit_paise": 0},
    ]

    with pytest.raises(ValueError, match="positive"):
        validate_voucher_rows(rows)
