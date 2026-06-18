from shreenivas_sons.services.accounting import AccountingService


def test_ledger_statement_tracks_running_balance(tmp_path):
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
    cash_ledger_id = service.create_ledger(company_id, "Cash", "Cash-in-Hand", 0, "Dr", "", "", "")
    sales_ledger_id = service.create_ledger(company_id, "Sales", "Sales Accounts", 0, "Cr", "", "", "")

    service.save_voucher(
        company_id=company_id,
        voucher_type="Sales",
        voucher_no="SAL-0001",
        voucher_date="2026-04-02",
        narration="Sample sale",
        rows=[
            {"ledger_id": cash_ledger_id, "debit_paise": 1000, "credit_paise": 0},
            {"ledger_id": sales_ledger_id, "debit_paise": 0, "credit_paise": 1000},
        ],
    )

    statement = service.ledger_statement(company_id, cash_ledger_id, "2026-04-01", "2026-04-30")

    assert statement["opening_balance_paise"] == 0
    assert statement["rows"][0]["running_balance_paise"] == 1000
    assert statement["closing_balance_paise"] == 1000
