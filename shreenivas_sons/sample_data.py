from __future__ import annotations

from datetime import date

from .config import DEFAULT_COMPANY_NAME
from .services.accounting import AccountingService


def _current_fy() -> tuple[str, str]:
    today = date(2026, 6, 18)
    if today.month >= 4:
        start_year = today.year
        end_year = today.year + 1
    else:
        start_year = today.year - 1
        end_year = today.year
    return f"{start_year}-04-01", f"{end_year}-03-31"


def seed_demo_data(service: AccountingService) -> int:
    companies = service.list_companies()
    if companies:
        company_id = companies[0]["id"]
        service.set_active_company(company_id)
        return company_id

    fy_start, fy_end = _current_fy()
    company_id = service.create_company(
        name=DEFAULT_COMPANY_NAME,
        address="",
        gst_number="",
        phone="",
        email="",
        fy_start=fy_start,
        fy_end=fy_end,
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
        voucher_date=fy_start,
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
        voucher_date=f"{fy_start[:4]}-04-05",
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
        voucher_date=f"{fy_start[:4]}-04-10",
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
        voucher_date=f"{fy_start[:4]}-04-15",
        narration="Office expense paid in cash",
        rows=[
            {"ledger_id": expense, "debit_paise": 20000, "credit_paise": 0},
            {"ledger_id": cash, "debit_paise": 0, "credit_paise": 20000},
        ],
    )

    service.set_active_company(company_id)
    return company_id

