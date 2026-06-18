from shreenivas_sons.services.accounting import AccountingService


def test_trial_balance_totals_match(sample_service):
    report = sample_service.trial_balance(sample_service.company_id, "2026-06-18")
    assert report["totals"]["debit_paise"] == report["totals"]["credit_paise"]
    assert report["totals"]["debit_paise"] == 818000


def test_profit_and_loss_returns_net_profit(sample_service):
    report = sample_service.profit_and_loss(sample_service.company_id, "2026-04-01", "2026-06-18")
    assert report["income_paise"] == 100000
    assert report["expense_paise"] == 20000
    assert report["net_profit_paise"] == 80000


def test_balance_sheet_balances(sample_service):
    report = sample_service.balance_sheet(sample_service.company_id, "2026-06-18")
    assert report["totals"]["assets_paise"] == 798000
    assert report["totals"]["liabilities_plus_capital_paise"] == 798000
