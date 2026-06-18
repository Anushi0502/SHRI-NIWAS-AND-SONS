from __future__ import annotations

from PyQt5.QtWidgets import QGridLayout, QHBoxLayout, QLabel, QPushButton, QVBoxLayout, QWidget

from ..widgets import StatCard
from ...utils.money import format_money


class DashboardPage(QWidget):
    def __init__(self, service, navigate_callback, parent=None):
        super().__init__(parent)
        self.service = service
        self.navigate_callback = navigate_callback

        layout = QVBoxLayout(self)
        self.title_label = QLabel("Dashboard")
        self.title_label.setStyleSheet("font-size: 20pt; font-weight: 700; color: #0f172a;")
        layout.addWidget(self.title_label)

        self.summary_grid = QGridLayout()
        self.company_card = StatCard("Business")
        self.cash_card = StatCard("Cash Balance")
        self.bank_card = StatCard("Bank Balance")
        self.receivables_card = StatCard("Receivables")
        self.payables_card = StatCard("Payables")
        self.fy_card = StatCard("Financial Year")

        cards = [
            self.company_card,
            self.cash_card,
            self.bank_card,
            self.receivables_card,
            self.payables_card,
            self.fy_card,
        ]
        positions = [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2)]
        for card, (row, col) in zip(cards, positions):
            self.summary_grid.addWidget(card, row, col)
        layout.addLayout(self.summary_grid)

        button_row = QHBoxLayout()
        buttons = [
            ("Create Ledger", "ledgers"),
            ("Voucher Entry", "vouchers"),
            ("Day Book", "daybook"),
            ("Trial Balance", "reports"),
            ("Profit & Loss", "reports"),
            ("Balance Sheet", "reports"),
        ]
        for label, target in buttons:
            button = QPushButton(label)
            button.clicked.connect(lambda checked=False, t=target: self.navigate_callback(t))
            button_row.addWidget(button)
        layout.addLayout(button_row)
        layout.addStretch(1)

    def refresh(self) -> None:
        company_id = self.service.active_company_id()
        if company_id is None:
            companies = self.service.list_companies()
            if not companies:
                return
            company_id = companies[0]["id"]
        summary = self.service.dashboard_summary(company_id)
        company = summary["company"]
        self.company_card.set_value(company["name"])
        self.cash_card.set_value(format_money(summary["cash_paise"]))
        self.bank_card.set_value(format_money(summary["bank_paise"]))
        self.receivables_card.set_value(format_money(summary["receivables_paise"]))
        self.payables_card.set_value(format_money(summary["payables_paise"]))
        self.fy_card.set_value(summary["financial_year"])

