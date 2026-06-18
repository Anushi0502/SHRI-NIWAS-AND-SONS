from __future__ import annotations

from PyQt5.QtCore import QDate
from PyQt5.QtWidgets import (
    QComboBox,
    QDateEdit,
    QFormLayout,
    QHBoxLayout,
    QMessageBox,
    QPushButton,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from ...services.exports import export_table_to_excel, export_table_to_pdf
from ..widgets import create_table, money_text, set_table_data, table_data


class LedgerReportTab(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        self.current_title = "Ledger Report"

        layout = QVBoxLayout(self)
        filters = QFormLayout()
        self.ledger_combo = QComboBox()
        self.start_date = QDateEdit()
        self.end_date = QDateEdit()
        for widget in (self.start_date, self.end_date):
            widget.setCalendarPopup(True)
            widget.setDisplayFormat("yyyy-MM-dd")
        filters.addRow("Ledger", self.ledger_combo)
        filters.addRow("From", self.start_date)
        filters.addRow("To", self.end_date)
        layout.addLayout(filters)

        self.table = create_table(7)
        self.table.setHorizontalHeaderLabels(["Date", "Voucher No", "Type", "Narration", "Debit", "Credit", "Running"])
        layout.addWidget(self.table, 1)

        buttons = QHBoxLayout()
        self.load_button = QPushButton("Load")
        self.export_excel_button = QPushButton("Export Excel")
        self.export_pdf_button = QPushButton("Export PDF")
        self.load_button.clicked.connect(self.load_report)
        self.export_excel_button.clicked.connect(self.export_excel)
        self.export_pdf_button.clicked.connect(self.export_pdf)
        buttons.addWidget(self.load_button)
        buttons.addWidget(self.export_excel_button)
        buttons.addWidget(self.export_pdf_button)
        layout.addLayout(buttons)

        today = QDate.currentDate()
        self.start_date.setDate(QDate(today.year(), 4, 1))
        self.end_date.setDate(today)

    def refresh(self) -> None:
        self.ledger_combo.clear()
        company_id = self._active_company_id()
        if company_id is None:
            return
        for ledger in self.service.list_ledgers(company_id):
            self.ledger_combo.addItem(ledger["name"], ledger["id"])
        if self.ledger_combo.count():
            self.load_report()

    def _active_company_id(self) -> int | None:
        company_id = self.service.active_company_id()
        if company_id is not None:
            return company_id
        companies = self.service.list_companies()
        return companies[0]["id"] if companies else None

    def load_report(self) -> None:
        company_id = self._active_company_id()
        if company_id is None or self.ledger_combo.currentData() is None:
            return
        start = self.start_date.date().toString("yyyy-MM-dd")
        end = self.end_date.date().toString("yyyy-MM-dd")
        statement = self.service.ledger_statement(company_id, int(self.ledger_combo.currentData()), start, end)
        rows = [
            [
                row["voucher_date"],
                row["voucher_no"],
                row["voucher_type"],
                row["narration"],
                money_text(row["debit_paise"]),
                money_text(row["credit_paise"]),
                money_text(row["running_balance_paise"]),
            ]
            for row in statement["rows"]
        ]
        rows.insert(0, ["", "", "", "Opening Balance", "", "", money_text(statement["opening_balance_paise"])])
        rows.append(["", "", "", "Closing Balance", "", "", money_text(statement["closing_balance_paise"])])
        set_table_data(self.table, ["Date", "Voucher No", "Type", "Narration", "Debit", "Credit", "Running"], rows)

    def export_excel(self) -> None:
        path = self._export_path("ledger_report.xlsx")
        headers, rows = table_data(self.table)
        export_table_to_excel(path, self.current_title, headers, rows)
        QMessageBox.information(self, "Report", f"Excel exported to {path}")

    def export_pdf(self) -> None:
        path = self._export_path("ledger_report.pdf")
        headers, rows = table_data(self.table)
        export_table_to_pdf(path, self.current_title, headers, rows)
        QMessageBox.information(self, "Report", f"PDF exported to {path}")

    def _export_path(self, filename: str):
        from pathlib import Path

        path = Path.cwd() / "exports" / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        return path


class TrialBalanceTab(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        self.current_title = "Trial Balance"
        layout = QVBoxLayout(self)
        controls = QHBoxLayout()
        self.as_on = QDateEdit()
        self.as_on.setCalendarPopup(True)
        self.as_on.setDisplayFormat("yyyy-MM-dd")
        self.load_button = QPushButton("Load")
        self.export_excel_button = QPushButton("Export Excel")
        self.export_pdf_button = QPushButton("Export PDF")
        self.load_button.clicked.connect(self.load_report)
        self.export_excel_button.clicked.connect(self.export_excel)
        self.export_pdf_button.clicked.connect(self.export_pdf)
        controls.addWidget(self.as_on)
        controls.addWidget(self.load_button)
        controls.addWidget(self.export_excel_button)
        controls.addWidget(self.export_pdf_button)
        layout.addLayout(controls)

        self.table = create_table(3)
        self.table.setHorizontalHeaderLabels(["Ledger", "Debit", "Credit"])
        layout.addWidget(self.table, 1)
        self.as_on.setDate(QDate.currentDate())

    def refresh(self) -> None:
        self.load_report()

    def _active_company_id(self) -> int | None:
        company_id = self.service.active_company_id()
        if company_id is not None:
            return company_id
        companies = self.service.list_companies()
        return companies[0]["id"] if companies else None

    def load_report(self) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            return
        report = self.service.trial_balance(company_id, self.as_on.date().toString("yyyy-MM-dd"))
        rows = [
            [row["ledger_name"], money_text(row["debit_paise"]), money_text(row["credit_paise"])]
            for row in report["rows"]
        ]
        rows.append(["Total", money_text(report["totals"]["debit_paise"]), money_text(report["totals"]["credit_paise"])])
        set_table_data(self.table, ["Ledger", "Debit", "Credit"], rows)

    def export_excel(self) -> None:
        path = self._export_path("trial_balance.xlsx")
        headers, rows = table_data(self.table)
        export_table_to_excel(path, self.current_title, headers, rows)
        QMessageBox.information(self, "Report", f"Excel exported to {path}")

    def export_pdf(self) -> None:
        path = self._export_path("trial_balance.pdf")
        headers, rows = table_data(self.table)
        export_table_to_pdf(path, self.current_title, headers, rows)
        QMessageBox.information(self, "Report", f"PDF exported to {path}")

    def _export_path(self, filename: str):
        from pathlib import Path

        path = Path.cwd() / "exports" / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        return path


class ProfitLossTab(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        self.current_title = "Profit and Loss"
        layout = QVBoxLayout(self)
        controls = QHBoxLayout()
        self.start_date = QDateEdit()
        self.end_date = QDateEdit()
        for widget in (self.start_date, self.end_date):
            widget.setCalendarPopup(True)
            widget.setDisplayFormat("yyyy-MM-dd")
        self.load_button = QPushButton("Load")
        self.export_excel_button = QPushButton("Export Excel")
        self.export_pdf_button = QPushButton("Export PDF")
        self.load_button.clicked.connect(self.load_report)
        self.export_excel_button.clicked.connect(self.export_excel)
        self.export_pdf_button.clicked.connect(self.export_pdf)
        controls.addWidget(self.start_date)
        controls.addWidget(self.end_date)
        controls.addWidget(self.load_button)
        controls.addWidget(self.export_excel_button)
        controls.addWidget(self.export_pdf_button)
        layout.addLayout(controls)

        self.table = create_table(3)
        self.table.setHorizontalHeaderLabels(["Section", "Ledger/Total", "Amount"])
        layout.addWidget(self.table, 1)
        today = QDate.currentDate()
        self.start_date.setDate(QDate(today.year(), 4, 1))
        self.end_date.setDate(today)

    def refresh(self) -> None:
        self.load_report()

    def _active_company_id(self) -> int | None:
        company_id = self.service.active_company_id()
        if company_id is not None:
            return company_id
        companies = self.service.list_companies()
        return companies[0]["id"] if companies else None

    def load_report(self) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            return
        report = self.service.profit_and_loss(
            company_id,
            self.start_date.date().toString("yyyy-MM-dd"),
            self.end_date.date().toString("yyyy-MM-dd"),
        )
        rows = [
            ["Income", "Total Income", money_text(report["income_paise"])],
            ["Expense", "Total Expense", money_text(report["expense_paise"])],
            ["Result", "Net Profit", money_text(report["net_profit_paise"])],
        ]
        set_table_data(self.table, ["Section", "Ledger/Total", "Amount"], rows)

    def export_excel(self) -> None:
        path = self._export_path("profit_loss.xlsx")
        headers, rows = table_data(self.table)
        export_table_to_excel(path, self.current_title, headers, rows)
        QMessageBox.information(self, "Report", f"Excel exported to {path}")

    def export_pdf(self) -> None:
        path = self._export_path("profit_loss.pdf")
        headers, rows = table_data(self.table)
        export_table_to_pdf(path, self.current_title, headers, rows)
        QMessageBox.information(self, "Report", f"PDF exported to {path}")

    def _export_path(self, filename: str):
        from pathlib import Path

        path = Path.cwd() / "exports" / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        return path


class BalanceSheetTab(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        self.current_title = "Balance Sheet"
        layout = QVBoxLayout(self)
        controls = QHBoxLayout()
        self.as_on = QDateEdit()
        self.as_on.setCalendarPopup(True)
        self.as_on.setDisplayFormat("yyyy-MM-dd")
        self.load_button = QPushButton("Load")
        self.export_excel_button = QPushButton("Export Excel")
        self.export_pdf_button = QPushButton("Export PDF")
        self.load_button.clicked.connect(self.load_report)
        self.export_excel_button.clicked.connect(self.export_excel)
        self.export_pdf_button.clicked.connect(self.export_pdf)
        controls.addWidget(self.as_on)
        controls.addWidget(self.load_button)
        controls.addWidget(self.export_excel_button)
        controls.addWidget(self.export_pdf_button)
        layout.addLayout(controls)

        self.table = create_table(3)
        self.table.setHorizontalHeaderLabels(["Section", "Item", "Amount"])
        layout.addWidget(self.table, 1)
        self.as_on.setDate(QDate.currentDate())

    def refresh(self) -> None:
        self.load_report()

    def _active_company_id(self) -> int | None:
        company_id = self.service.active_company_id()
        if company_id is not None:
            return company_id
        companies = self.service.list_companies()
        return companies[0]["id"] if companies else None

    def load_report(self) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            return
        report = self.service.balance_sheet(company_id, self.as_on.date().toString("yyyy-MM-dd"))
        rows = [
            ["Assets", "Total Assets", money_text(report["totals"]["assets_paise"])],
            ["Liabilities + Capital", "Total", money_text(report["totals"]["liabilities_plus_capital_paise"])],
            ["Result", "Net Profit", money_text(report["net_profit_paise"])],
        ]
        set_table_data(self.table, ["Section", "Item", "Amount"], rows)

    def export_excel(self) -> None:
        path = self._export_path("balance_sheet.xlsx")
        headers, rows = table_data(self.table)
        export_table_to_excel(path, self.current_title, headers, rows)
        QMessageBox.information(self, "Report", f"Excel exported to {path}")

    def export_pdf(self) -> None:
        path = self._export_path("balance_sheet.pdf")
        headers, rows = table_data(self.table)
        export_table_to_pdf(path, self.current_title, headers, rows)
        QMessageBox.information(self, "Report", f"PDF exported to {path}")

    def _export_path(self, filename: str):
        from pathlib import Path

        path = Path.cwd() / "exports" / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        return path


class ReportsPage(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        layout = QVBoxLayout(self)
        self.tabs = QTabWidget()
        self.ledger_tab = LedgerReportTab(service)
        self.trial_tab = TrialBalanceTab(service)
        self.pnl_tab = ProfitLossTab(service)
        self.balance_tab = BalanceSheetTab(service)
        self.tabs.addTab(self.ledger_tab, "Ledger Report")
        self.tabs.addTab(self.trial_tab, "Trial Balance")
        self.tabs.addTab(self.pnl_tab, "Profit & Loss")
        self.tabs.addTab(self.balance_tab, "Balance Sheet")
        layout.addWidget(self.tabs)

    def refresh(self) -> None:
        self.ledger_tab.refresh()
        self.trial_tab.refresh()
        self.pnl_tab.refresh()
        self.balance_tab.refresh()

