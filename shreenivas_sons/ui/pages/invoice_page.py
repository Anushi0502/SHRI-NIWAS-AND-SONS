from __future__ import annotations

from PyQt5.QtCore import QDate, Qt
from PyQt5.QtWidgets import (
    QComboBox,
    QDateEdit,
    QFormLayout,
    QHBoxLayout,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QDoubleSpinBox,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ...utils.money import format_money
from ..widgets import create_table, money_text


class InvoicePage(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        self.last_invoice_id = None

        layout = QVBoxLayout(self)

        form = QFormLayout()
        self.customer_combo = QComboBox()
        self.invoice_no_edit = QLineEdit()
        self.invoice_date_edit = QDateEdit()
        self.invoice_date_edit.setCalendarPopup(True)
        self.invoice_date_edit.setDisplayFormat("yyyy-MM-dd")
        self.invoice_date_edit.setDate(QDate.currentDate())
        self.invoice_date_edit.dateChanged.connect(self._refresh_invoice_no)
        self.invoice_no_edit.setReadOnly(True)
        self.narration_edit = QLineEdit()
        form.addRow("Customer", self.customer_combo)
        form.addRow("Invoice No", self.invoice_no_edit)
        form.addRow("Date", self.invoice_date_edit)
        form.addRow("Narration", self.narration_edit)
        layout.addLayout(form)

        self.table = create_table(7)
        self.table.setHorizontalHeaderLabels(["Item", "Qty", "Rate", "Tax %", "Amount", "Tax", "Total"])
        layout.addWidget(self.table, 1)

        totals_row = QHBoxLayout()
        self.subtotal_label = QLineEdit("0.00")
        self.subtotal_label.setReadOnly(True)
        self.tax_label = QLineEdit("0.00")
        self.tax_label.setReadOnly(True)
        self.grand_total_label = QLineEdit("0.00")
        self.grand_total_label.setReadOnly(True)
        form2 = QFormLayout()
        form2.addRow("Subtotal", self.subtotal_label)
        form2.addRow("Tax", self.tax_label)
        form2.addRow("Grand Total", self.grand_total_label)
        totals_row.addLayout(form2)
        layout.addLayout(totals_row)

        button_row = QHBoxLayout()
        self.add_row_button = QPushButton("Add Row")
        self.remove_row_button = QPushButton("Remove Row")
        self.save_button = QPushButton("Save Invoice")
        self.add_row_button.clicked.connect(self.add_row)
        self.remove_row_button.clicked.connect(self.remove_row)
        self.save_button.clicked.connect(self.save_invoice)
        button_row.addWidget(self.add_row_button)
        button_row.addWidget(self.remove_row_button)
        button_row.addWidget(self.save_button)
        layout.addLayout(button_row)

        self.add_row()
        self.add_row()
        self.refresh()

    def _active_company_id(self) -> int | None:
        company_id = self.service.active_company_id()
        if company_id is not None:
            return company_id
        companies = self.service.list_companies()
        return companies[0]["id"] if companies else None

    def _refresh_invoice_no(self, *_args) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            self.invoice_no_edit.clear()
            return
        self.invoice_no_edit.setText(
            self.service.next_voucher_no(company_id, "Sales", self.invoice_date_edit.date().toString("yyyy-MM-dd"))
        )

    def refresh(self) -> None:
        self.customer_combo.clear()
        company_id = self._active_company_id()
        if company_id is None:
            return
        ledgers = self.service.list_ledgers(company_id)
        for ledger in ledgers:
            if ledger["group_name"] in {"Sundry Debtors", "Cash-in-Hand", "Bank Accounts"}:
                self.customer_combo.addItem(ledger["name"], ledger["id"])
        if self.customer_combo.count() == 0:
            for ledger in ledgers:
                self.customer_combo.addItem(ledger["name"], ledger["id"])
        self._refresh_invoice_no()
        self._refresh_ledgers()

    def _refresh_ledgers(self) -> None:
        ledgers = self.service.list_ledgers(self._active_company_id() or 0)
        self.ledger_options = ledgers
        for row in range(self.table.rowCount()):
            combo = self.table.cellWidget(row, 0)
            if isinstance(combo, QComboBox):
                combo.blockSignals(True)
                combo.clear()
                for ledger in ledgers:
                    combo.addItem(ledger["name"], ledger["id"])
                combo.blockSignals(False)

    def add_row(self) -> None:
        row = self.table.rowCount()
        self.table.insertRow(row)
        item_combo = QComboBox()
        for ledger in getattr(self, "ledger_options", []):
            item_combo.addItem(ledger["name"], ledger["id"])
        qty = QDoubleSpinBox()
        qty.setMaximum(9999999)
        qty.setDecimals(2)
        rate = QDoubleSpinBox()
        rate.setMaximum(9999999)
        rate.setDecimals(2)
        tax = QDoubleSpinBox()
        tax.setMaximum(100)
        tax.setDecimals(2)

        amount_item = QTableWidgetItem("0.00")
        amount_item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
        tax_amount_item = QTableWidgetItem("0.00")
        tax_amount_item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
        total_item = QTableWidgetItem("0.00")
        total_item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)

        qty.valueChanged.connect(lambda *_: self._recalculate())
        rate.valueChanged.connect(lambda *_: self._recalculate())
        tax.valueChanged.connect(lambda *_: self._recalculate())

        self.table.setCellWidget(row, 0, item_combo)
        self.table.setCellWidget(row, 1, qty)
        self.table.setCellWidget(row, 2, rate)
        self.table.setCellWidget(row, 3, tax)
        self.table.setItem(row, 4, amount_item)
        self.table.setItem(row, 5, tax_amount_item)
        self.table.setItem(row, 6, total_item)
        self._recalculate()

    def remove_row(self) -> None:
        row = self.table.currentRow()
        if row >= 0:
            self.table.removeRow(row)
            self._recalculate()

    def _recalculate(self) -> None:
        subtotal = 0
        tax_total = 0
        for row in range(self.table.rowCount()):
            qty = self.table.cellWidget(row, 1)
            rate = self.table.cellWidget(row, 2)
            tax = self.table.cellWidget(row, 3)
            if not isinstance(qty, QDoubleSpinBox) or not isinstance(rate, QDoubleSpinBox) or not isinstance(tax, QDoubleSpinBox):
                continue
            line_total = round(qty.value() * rate.value() * 100)
            tax_amount = round(line_total * tax.value() / 100)
            total = line_total + tax_amount
            subtotal += line_total
            tax_total += tax_amount
            self.table.item(row, 4).setText(f"{line_total / 100:.2f}")
            self.table.item(row, 5).setText(f"{tax_amount / 100:.2f}")
            self.table.item(row, 6).setText(f"{total / 100:.2f}")
        self.subtotal_label.setText(f"{subtotal / 100:.2f}")
        self.tax_label.setText(f"{tax_total / 100:.2f}")
        self.grand_total_label.setText(f"{(subtotal + tax_total) / 100:.2f}")

    def _collect_items(self) -> list[dict]:
        items = []
        for row in range(self.table.rowCount()):
            combo = self.table.cellWidget(row, 0)
            qty = self.table.cellWidget(row, 1)
            rate = self.table.cellWidget(row, 2)
            tax = self.table.cellWidget(row, 3)
            if not isinstance(combo, QComboBox) or not isinstance(qty, QDoubleSpinBox) or not isinstance(rate, QDoubleSpinBox) or not isinstance(tax, QDoubleSpinBox):
                continue
            if qty.value() <= 0 or rate.value() <= 0:
                continue
            items.append(
                {
                    "item_name": combo.currentText(),
                    "quantity": qty.value(),
                    "rate_paise": int(round(rate.value() * 100)),
                    "tax_rate_percent": tax.value(),
                }
            )
        return items

    def save_invoice(self) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            QMessageBox.warning(self, "Invoice", "Create or open a company first.")
            return
        if self.customer_combo.currentData() is None:
            QMessageBox.warning(self, "Invoice", "Select a customer.")
            return
        items = self._collect_items()
        if not items:
            QMessageBox.warning(self, "Invoice", "Add at least one invoice item.")
            return
        try:
            invoice_id = self.service.save_invoice(
                company_id=company_id,
                invoice_no=self.invoice_no_edit.text().strip(),
                invoice_date=self.invoice_date_edit.date().toString("yyyy-MM-dd"),
                customer_ledger_id=int(self.customer_combo.currentData()),
                items=items,
                narration=self.narration_edit.text().strip(),
            )
            pdf_path = self._invoice_pdf_path()
            self.service.generate_invoice_pdf(invoice_id, pdf_path)
        except Exception as exc:  # pragma: no cover - user feedback path
            QMessageBox.warning(self, "Invoice", str(exc))
            return
        self.last_invoice_id = invoice_id
        self._refresh_invoice_no()
        QMessageBox.information(self, "Invoice", f"Invoice saved and PDF created at {pdf_path}")

    def _invoice_pdf_path(self):
        from pathlib import Path

        path = Path.cwd() / "exports" / "invoices" / f"{self.invoice_no_edit.text().strip()}.pdf"
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

