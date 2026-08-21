from shreenivas_sons.sample_data import seed_demo_data
from shreenivas_sons.services.accounting import AccountingService


def test_seed_data_creates_demo_company(tmp_path):
    service = AccountingService(tmp_path / "accounting.db")
    service.initialize()

    seed_demo_data(service)

    companies = service.list_companies()
    assert companies[0]["name"] == "Global Creative Services"

    ledgers = service.list_ledgers(companies[0]["id"])
    ledger_names = {ledger["name"] for ledger in ledgers}
    assert "Cash" in ledger_names
    assert "Sales" in ledger_names

    vouchers = service.list_vouchers(companies[0]["id"], "2026-04-01", "2027-03-31")
    assert len(vouchers) >= 3
