from __future__ import annotations

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from .pages.backup_page import BackupPage
from .pages.company_page import CompanyPage
from .pages.dashboard_page import DashboardPage
from .pages.daybook_page import DayBookPage
from .pages.invoice_page import InvoicePage
from .pages.ledger_page import LedgerPage
from .pages.reports_page import ReportsPage
from .pages.voucher_page import VoucherPage
from .styles import APP_STYLE


class MainWindow(QMainWindow):
    def __init__(self, service):
        super().__init__()
        self.service = service
        self.setWindowTitle("Global Creative Services Accounting")
        self.resize(1440, 900)
        self.setStyleSheet(APP_STYLE)

        root = QWidget()
        self.setCentralWidget(root)
        root_layout = QHBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)

        self.sidebar = QFrame()
        self.sidebar.setObjectName("Sidebar")
        self.sidebar.setFixedWidth(240)
        sidebar_layout = QVBoxLayout(self.sidebar)
        sidebar_layout.setContentsMargins(18, 18, 18, 18)
        sidebar_layout.setSpacing(10)

        brand_title = QLabel("Global Creative Services")
        brand_title.setObjectName("BrandTitle")
        brand_subtitle = QLabel("Accounting desktop app")
        brand_subtitle.setObjectName("BrandSubTitle")
        sidebar_layout.addWidget(brand_title)
        sidebar_layout.addWidget(brand_subtitle)

        self.nav_list = QListWidget()
        self.nav_list.addItem("Dashboard")
        self.nav_list.addItem("Company")
        self.nav_list.addItem("Ledgers")
        self.nav_list.addItem("Voucher Entry")
        self.nav_list.addItem("Day Book")
        self.nav_list.addItem("Reports")
        self.nav_list.addItem("Invoice")
        self.nav_list.addItem("Backup / Restore")
        self.nav_list.currentRowChanged.connect(self._switch_page)
        sidebar_layout.addWidget(self.nav_list, 1)

        self.header = QLabel()
        self.header.setStyleSheet("font-size: 15pt; font-weight: 700; color: #0f172a; padding: 14px;")
        self.stack = QStackedWidget()

        self.dashboard_page = DashboardPage(service, self.navigate_to)
        self.company_page = CompanyPage(service, self._company_changed)
        self.ledger_page = LedgerPage(service)
        self.voucher_page = VoucherPage(service)
        self.daybook_page = DayBookPage(service)
        self.reports_page = ReportsPage(service)
        self.invoice_page = InvoicePage(service)
        self.backup_page = BackupPage(service)

        self.pages = [
            self.dashboard_page,
            self.company_page,
            self.ledger_page,
            self.voucher_page,
            self.daybook_page,
            self.reports_page,
            self.invoice_page,
            self.backup_page,
        ]
        for page in self.pages:
            self.stack.addWidget(page)

        content = QWidget()
        content_layout = QVBoxLayout(content)
        content_layout.setContentsMargins(18, 18, 18, 18)
        content_layout.addWidget(self.header)
        content_layout.addWidget(self.stack, 1)

        root_layout.addWidget(self.sidebar)
        root_layout.addWidget(content, 1)

        self.nav_list.setCurrentRow(0)
        self.refresh_context()

    def navigate_to(self, target: str) -> None:
        mapping = {
            "dashboard": 0,
            "company": 1,
            "ledgers": 2,
            "vouchers": 3,
            "daybook": 4,
            "reports": 5,
            "invoice": 6,
            "backup": 7,
        }
        self.nav_list.setCurrentRow(mapping.get(target, 0))

    def _switch_page(self, index: int) -> None:
        if index < 0:
            return
        self.stack.setCurrentIndex(index)
        current = self.stack.currentWidget()
        refresh = getattr(current, "refresh", None)
        if callable(refresh):
            refresh()

    def _company_changed(self) -> None:
        self.refresh_context()
        self.refresh_all_pages()

    def refresh_context(self) -> None:
        company_id = self.service.active_company_id()
        if company_id is None:
            companies = self.service.list_companies()
            company_id = companies[0]["id"] if companies else None
        if company_id is None:
            self.header.setText("No company selected")
            return
        company = self.service.get_company(company_id)
        if company is None:
            self.header.setText("No company selected")
            return
        self.header.setText(f"{company['name']}  |  FY {company['fy_start']} to {company['fy_end']}")

    def refresh_all_pages(self) -> None:
        for page in self.pages:
            refresh = getattr(page, "refresh", None)
            if callable(refresh):
                refresh()
