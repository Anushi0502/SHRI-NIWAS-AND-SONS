from __future__ import annotations

from PyQt5.QtCore import QDate
from PyQt5.QtWidgets import (
    QComboBox,
    QDateEdit,
    QFormLayout,
    QHBoxLayout,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ...utils.money import format_money, money_to_paise
from ..widgets import create_table


class VoucherPage(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service

        layout = QVBoxLayout(self)

        form = QFormLayout()
        self.voucher_type_combo = QComboBox()
        self.voucher_type_combo.addItems(["Payment", "Receipt", "Sales", "Purchase", "Journal", "Contra"])
        self.voucher_type_combo.currentTextChanged.connect(self._refresh_voucher_no)
        self.voucher_date_edit = QDateEdit()
        self.voucher_date_edit.setCalendarPopup(True)
        self.voucher_date_edit.setDisplayFormat("yyyy-MM-dd")
        self.voucher_date_edit.setDate(QDate.currentDate())
        self.voucher_date_edit.dateChanged.connect(self._refresh_voucher_no)
        self.voucher_no_edit = QLineEdit()
        self.narration_edit = QLineEdit()
        form.addRow("Voucher Type", self.voucher_type_combo)
        form.addRow("Voucher Date", self.voucher_date_edit)
        form.addRow("Voucher No", self.voucher_no_edit)
        form.addRow("Narration", self.narration_edit)
        layout.addLayout(form)

        self.table = create_table(4)
        self.table.setHorizontalHeaderLabels(["Ledger", "Debit", "Credit", "Narration"])
        layout.addWidget(self.table, 1)

        row_buttons = QHBoxLayout()
        self.add_row_button = QPushButton("Add Row")
        self.remove_row_button = QPushButton("Remove Row")
        self.save_button = QPushButton("Save Voucher")
        self.add_row_button.clicked.connect(self.add_row)
        self.remove_row_button.clicked.connect(self.remove_row)
        self.save_button.clicked.connect(self.save_voucher)
        row_buttons.addWidget(self.add_row_button)
        row_buttons.addWidget(self.remove_row_button)
        row_buttons.addWidget(self.save_button)
        layout.addLayout(row_buttons)

        self.add_row()
        self.add_row()
        self._refresh_ledgers()
        self._refresh_voucher_no()

    def _active_company_id(self) -> int | None:
        company_id = self.service.active_company_id()
        if company_id is not None:
            return company_id
        companies = self.service.list_companies()
        return companies[0]["id"] if companies else None

    def _refresh_ledgers(self) -> None:
        self.ledger_options = self.service.list_ledgers(self._active_company_id() or 0)
        for row in range(self.table.rowCount()):
            combo = self.table.cellWidget(row, 0)
            if isinstance(combo, QComboBox):
                combo.blockSignals(True)
                combo.clear()
                for ledger in self.ledger_options:
                    combo.addItem(ledger["name"], ledger["id"])
                combo.blockSignals(False)

    def _refresh_voucher_no(self, *_args) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            self.voucher_no_edit.clear()
            return
        voucher_date = self.voucher_date_edit.date().toString("yyyy-MM-dd")
        self.voucher_no_edit.setText(
            self.service.next_voucher_no(company_id, self.voucher_type_combo.currentText(), voucher_date)
        )

    def add_row(self) -> None:
        row = self.table.rowCount()
        self.table.insertRow(row)

        ledger_combo = QComboBox()
        for ledger in getattr(self, "ledger_options", []):
            ledger_combo.addItem(ledger["name"], ledger["id"])
        debit_edit = QLineEdit()
        debit_edit.setPlaceholderText("Debit")
        credit_edit = QLineEdit()
        credit_edit.setPlaceholderText("Credit")
        narration_edit = QLineEdit()

        self.table.setCellWidget(row, 0, ledger_combo)
        self.table.setCellWidget(row, 1, debit_edit)
        self.table.setCellWidget(row, 2, credit_edit)
        self.table.setCellWidget(row, 3, narration_edit)

    def remove_row(self) -> None:
        row = self.table.currentRow()
        if row >= 0:
            self.table.removeRow(row)

    def _collect_rows(self) -> list[dict]:
        rows = []
        for row in range(self.table.rowCount()):
            ledger_combo = self.table.cellWidget(row, 0)
            debit_edit = self.table.cellWidget(row, 1)
            credit_edit = self.table.cellWidget(row, 2)
            narration_edit = self.table.cellWidget(row, 3)
            if not isinstance(ledger_combo, QComboBox) or not isinstance(debit_edit, QLineEdit) or not isinstance(credit_edit, QLineEdit):
                continue
            debit_text = debit_edit.text().strip()
            credit_text = credit_edit.text().strip()
            if not debit_text and not credit_text:
                continue
            rows.append(
                {
                    "ledger_id": int(ledger_combo.currentData()),
                    "debit_paise": money_to_paise(debit_text) if debit_text else 0,
                    "credit_paise": money_to_paise(credit_text) if credit_text else 0,
                    "narration": narration_edit.text().strip() if isinstance(narration_edit, QLineEdit) else "",
                }
            )
        return rows

    def save_voucher(self) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            QMessageBox.warning(self, "Voucher", "Create or open a company first.")
            return
        rows = self._collect_rows()
        if len(rows) < 2:
            QMessageBox.warning(self, "Voucher", "Add at least two voucher rows.")
            return
        try:
            voucher_id = self.service.save_voucher(
                company_id=company_id,
                voucher_type=self.voucher_type_combo.currentText(),
                voucher_no=self.voucher_no_edit.text().strip(),
                voucher_date=self.voucher_date_edit.date().toString("yyyy-MM-dd"),
                narration=self.narration_edit.text().strip(),
                rows=rows,
            )
        except Exception as exc:  # pragma: no cover - user feedback path
            QMessageBox.warning(self, "Voucher", str(exc))
            return
        self.clear_rows()
        self._refresh_voucher_no()
        QMessageBox.information(self, "Voucher", f"Voucher saved with ID {voucher_id}.")

    def clear_rows(self) -> None:
        while self.table.rowCount():
            self.table.removeRow(0)
        self.add_row()
        self.add_row()
        self._refresh_ledgers()

