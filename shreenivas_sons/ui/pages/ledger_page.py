from __future__ import annotations

from PyQt5.QtWidgets import (
    QComboBox,
    QDoubleSpinBox,
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

from ...utils.money import money_to_paise, paise_to_money
from ..widgets import create_table, money_text


class LedgerPage(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        self.current_ledger_id = None

        layout = QVBoxLayout(self)

        search_row = QHBoxLayout()
        self.search_edit = QLineEdit()
        self.search_edit.setPlaceholderText("Search ledger by name")
        self.search_edit.textChanged.connect(self.refresh)
        search_row.addWidget(self.search_edit)
        layout.addLayout(search_row)

        self.table = create_table(8)
        self.table.setHorizontalHeaderLabels(
            ["Name", "Group", "Opening", "Type", "Address", "Phone", "GST", "ID"]
        )
        self.table.itemSelectionChanged.connect(self._load_selected_ledger)
        layout.addWidget(self.table, 2)

        form = QFormLayout()
        self.name_edit = QLineEdit()
        self.group_combo = QComboBox()
        self.opening_balance = QDoubleSpinBox()
        self.opening_balance.setMaximum(9999999999.99)
        self.opening_balance.setDecimals(2)
        self.balance_type_combo = QComboBox()
        self.balance_type_combo.addItems(["Dr", "Cr"])
        self.address_edit = QLineEdit()
        self.phone_edit = QLineEdit()
        self.gst_edit = QLineEdit()

        form.addRow("Name", self.name_edit)
        form.addRow("Group", self.group_combo)
        form.addRow("Opening Balance", self.opening_balance)
        form.addRow("Type", self.balance_type_combo)
        form.addRow("Address", self.address_edit)
        form.addRow("Phone", self.phone_edit)
        form.addRow("GST Number", self.gst_edit)
        layout.addLayout(form)

        button_row = QHBoxLayout()
        self.new_button = QPushButton("New")
        self.save_button = QPushButton("Save")
        self.delete_button = QPushButton("Delete")
        self.new_button.clicked.connect(self.clear_form)
        self.save_button.clicked.connect(self.save_ledger)
        self.delete_button.clicked.connect(self.delete_ledger)
        button_row.addWidget(self.new_button)
        button_row.addWidget(self.save_button)
        button_row.addWidget(self.delete_button)
        layout.addLayout(button_row)
        self.refresh()

    def _active_company_id(self) -> int | None:
        company_id = self.service.active_company_id()
        if company_id is not None:
            return company_id
        companies = self.service.list_companies()
        return companies[0]["id"] if companies else None

    def refresh(self, *_args) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            return
        search = self.search_edit.text().strip()
        self.group_combo.clear()
        for group in self.service.list_groups():
            self.group_combo.addItem(group["name"])

        ledgers = self.service.list_ledgers(company_id, search=search)
        self.table.setRowCount(len(ledgers))
        for row_index, ledger in enumerate(ledgers):
            values = [
                ledger["name"],
                ledger["group_name"],
                money_text(ledger["opening_balance_paise"]),
                ledger["opening_balance_type"],
                ledger["address"],
                ledger["phone"],
                ledger["gst_number"],
                str(ledger["id"]),
            ]
            for col_index, value in enumerate(values):
                self.table.setItem(row_index, col_index, QTableWidgetItem(value))
        self.table.resizeColumnsToContents()
        if ledgers and self.current_ledger_id is None:
            self._fill_form(ledgers[0])

    def clear_form(self) -> None:
        self.current_ledger_id = None
        self.name_edit.clear()
        self.group_combo.setCurrentIndex(0)
        self.opening_balance.setValue(0.0)
        self.balance_type_combo.setCurrentText("Dr")
        self.address_edit.clear()
        self.phone_edit.clear()
        self.gst_edit.clear()

    def _load_selected_ledger(self) -> None:
        row = self.table.currentRow()
        if row < 0:
            return
        ledger_id_item = self.table.item(row, 7)
        if ledger_id_item is None:
            return
        ledger = self.service.get_ledger(int(ledger_id_item.text()))
        if ledger:
            self._fill_form(ledger)

    def _fill_form(self, ledger: dict) -> None:
        self.current_ledger_id = ledger["id"]
        self.name_edit.setText(ledger["name"])
        index = self.group_combo.findText(ledger["group_name"])
        if index >= 0:
            self.group_combo.setCurrentIndex(index)
        self.opening_balance.setValue(float(paise_to_money(ledger["opening_balance_paise"])))
        self.balance_type_combo.setCurrentText(ledger["opening_balance_type"])
        self.address_edit.setText(ledger["address"])
        self.phone_edit.setText(ledger["phone"])
        self.gst_edit.setText(ledger["gst_number"])

    def save_ledger(self) -> None:
        company_id = self._active_company_id()
        if company_id is None:
            QMessageBox.warning(self, "Ledger", "Create or open a company first.")
            return
        name = self.name_edit.text().strip()
        if not name:
            QMessageBox.warning(self, "Ledger", "Ledger name is required.")
            return
        values = (
            name,
            self.group_combo.currentText(),
            money_to_paise(self.opening_balance.value()),
            self.balance_type_combo.currentText(),
            self.address_edit.text().strip(),
            self.phone_edit.text().strip(),
            self.gst_edit.text().strip(),
        )
        if self.current_ledger_id is None:
            self.service.create_ledger(company_id, *values)
        else:
            self.service.update_ledger(self.current_ledger_id, *values)
        self.refresh()
        QMessageBox.information(self, "Ledger", "Ledger saved.")

    def delete_ledger(self) -> None:
        if self.current_ledger_id is None:
            QMessageBox.warning(self, "Ledger", "Select a ledger first.")
            return
        self.service.delete_ledger(self.current_ledger_id)
        self.clear_form()
        self.refresh()
        QMessageBox.information(self, "Ledger", "Ledger deleted.")

