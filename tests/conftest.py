from pathlib import Path

import pytest

from shreenivas_sons.services.accounting import AccountingService


@pytest.fixture()
def sample_service(tmp_path):
    service = AccountingService(tmp_path / "accounting.db")
    service.initialize()
    company_id = service.create_company(
        name="Shreenivas & Sons",
        address="",
        gst_number="",
        phone="",
        email="",
        fy_start="2026-04-01",
        fy_end="2027-03-31",
    )
    cash = service.create_ledger(company_id, "Cash", "Cash-in-Hand", 0, "Dr", "", "", "")
    sales = service.create_ledger(company_id, "Sales", "Sales Accounts", 0, "Cr", "", "", "")
    expense = service.create_ledger(company_id, "Office Expense", "Expense", 0, "Dr", "", "", "")
    capital = service.create_ledger(company_id, "Capital", "Capital", 0, "Cr", "", "", "")
    debtor = service.create_ledger(company_id, "ABC Traders", "Sundry Debtors", 0, "Dr", "", "", "")
    tax = service.create_ledger(company_id, "Output GST", "Duties & Taxes", 0, "Cr", "", "", "")

    service.save_voucher(
        company_id=company_id,
        voucher_type="Journal",
        voucher_no="JV-0001",
        voucher_date="2026-04-01",
        narration="Capital introduction",
        rows=[
            {"ledger_id": cash, "debit_paise": 700000, "credit_paise": 0},
            {"ledger_id": capital, "debit_paise": 0, "credit_paise": 700000},
        ],
    )
    service.save_voucher(
        company_id=company_id,
        voucher_type="Sales",
        voucher_no="SAL-0001",
        voucher_date="2026-04-05",
        narration="Sale to ABC Traders",
        rows=[
            {"ledger_id": debtor, "debit_paise": 118000, "credit_paise": 0},
            {"ledger_id": sales, "debit_paise": 0, "credit_paise": 100000},
            {"ledger_id": tax, "debit_paise": 0, "credit_paise": 18000},
        ],
    )
    service.save_voucher(
        company_id=company_id,
        voucher_type="Receipt",
        voucher_no="REC-0001",
        voucher_date="2026-04-10",
        narration="Receipt from ABC Traders",
        rows=[
            {"ledger_id": cash, "debit_paise": 118000, "credit_paise": 0},
            {"ledger_id": debtor, "debit_paise": 0, "credit_paise": 118000},
        ],
    )
    service.save_voucher(
        company_id=company_id,
        voucher_type="Payment",
        voucher_no="PAY-0001",
        voucher_date="2026-04-15",
        narration="Office expense paid in cash",
        rows=[
            {"ledger_id": expense, "debit_paise": 20000, "credit_paise": 0},
            {"ledger_id": cash, "debit_paise": 0, "credit_paise": 20000},
        ],
    )
    service.company_id = company_id
    service.ledger_ids = {
        "cash": cash,
        "sales": sales,
        "expense": expense,
        "capital": capital,
        "debtor": debtor,
        "tax": tax,
    }
    return service
