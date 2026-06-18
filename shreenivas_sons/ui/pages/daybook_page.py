from __future__ import annotations

from PyQt5.QtCore import QDate
from PyQt5.QtWidgets import (
    QComboBox,
    QDateEdit,
    QFormLayout,
    QHBoxLayout,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from ..dialogs import VoucherDetailDialog
from ..widgets import create_table, money_text, set_table_data


class DayBookPage(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        self.current_rows = []

        layout = QVBoxLayout(self)
        filters = QFormLayout()
        self.start_date = QDateEdit()
        self.start_date.setCalendarPopup(True)
        self.start_date.setDisplayFormat("yyyy-MM-dd")
        self.end_date = QDateEdit()
        self.end_date.setCalendarPopup(True)
        self.end_date.setDisplayFormat("yyyy-MM-dd")
        self.voucher_type_combo = QComboBox()
        self.voucher_type_combo.addItem("All")
        self.voucher_type_combo.addItems(["Payment", "Receipt", "Sales", "Purchase", "Journal", "Contra"])
        filters.addRow("From", self.start_date)
        filters.addRow("To", self.end_date)
        filters.addRow("Voucher Type", self.voucher_type_combo)
        layout.addLayout(filters)

        self.table = create_table(6)
        self.table.setHorizontalHeaderLabels(["Date", "Voucher No", "Type", "Narration", "Debit", "Credit"])
        self.table.cellDoubleClicked.connect(self.open_detail)
        layout.addWidget(self.table, 1)

        button_row = QHBoxLayout()
        self.load_button = QPushButton("Load")
        self.load_button.clicked.connect(self.refresh)
        button_row.addWidget(self.load_button)
        layout.addLayout(button_row)

        today = QDate.currentDate()
        self.start_date.setDate(QDate(today.year(), 4, 1))
        self.end_date.setDate(today)
        self.refresh()

    def _active_company_id(self) -> int | None:
        company_id = self.service.active_company_id()
        if company_id is not None:
            return company_id
        companies = self.service.list_companies()
        return companies[0]["id"] if companies else None

    def refresh(self) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            return
        start = self.start_date.date().toString("yyyy-MM-dd")
        end = self.end_date.date().toString("yyyy-MM-dd")
        voucher_type = self.voucher_type_combo.currentText()
        day_book = self.service.day_book(company_id, start, end, "" if voucher_type == "All" else voucher_type)
        self.current_rows = day_book["rows"]
        rows = [
            [
                row["voucher_date"],
                row["voucher_no"],
                row["voucher_type"],
                row["narration"],
                money_text(row["debit_paise"]),
                money_text(row["credit_paise"]),
            ]
            for row in self.current_rows
        ]
        set_table_data(self.table, ["Date", "Voucher No", "Type", "Narration", "Debit", "Credit"], rows)

    def open_detail(self, row: int, _column: int) -> None:
        if row < 0 or row >= len(self.current_rows):
            return
        voucher_id = self.current_rows[row]["voucher_id"]
        detail = self.service.voucher_details(voucher_id)
        if detail is None:
            QMessageBox.warning(self, "Day Book", "Voucher not found.")
            return
        dialog = VoucherDetailDialog(detail, self)
        dialog.exec_()

