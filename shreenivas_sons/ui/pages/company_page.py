from __future__ import annotations

from PyQt5.QtCore import QDate
from PyQt5.QtWidgets import (
    QDateEdit,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ..widgets import create_table


class CompanyPage(QWidget):
    def __init__(self, service, company_changed_callback, parent=None):
        super().__init__(parent)
        self.service = service
        self.company_changed_callback = company_changed_callback
        self.current_company_id = None

        layout = QHBoxLayout(self)

        self.table = create_table(8)
        self.table.setHorizontalHeaderLabels(
            ["Name", "Address", "GST", "Phone", "Email", "FY Start", "FY End", "ID"]
        )
        self.table.itemSelectionChanged.connect(self._load_selected_company)
        layout.addWidget(self.table, 2)

        form_panel = QWidget()
        form_layout = QVBoxLayout(form_panel)
        form_layout.addWidget(QLabel("Company Details"))

        form = QFormLayout()
        self.name_edit = QLineEdit()
        self.address_edit = QLineEdit()
        self.gst_edit = QLineEdit()
        self.phone_edit = QLineEdit()
        self.email_edit = QLineEdit()
        self.fy_start_edit = QDateEdit()
        self.fy_start_edit.setCalendarPopup(True)
        self.fy_end_edit = QDateEdit()
        self.fy_end_edit.setCalendarPopup(True)
        for widget in (self.fy_start_edit, self.fy_end_edit):
            widget.setDisplayFormat("yyyy-MM-dd")
        form.addRow("Name", self.name_edit)
        form.addRow("Address", self.address_edit)
        form.addRow("GST Number", self.gst_edit)
        form.addRow("Phone", self.phone_edit)
        form.addRow("Email", self.email_edit)
        form.addRow("FY Start", self.fy_start_edit)
        form.addRow("FY End", self.fy_end_edit)
        form_layout.addLayout(form)

        button_row = QHBoxLayout()
        self.new_button = QPushButton("New")
        self.save_button = QPushButton("Save")
        self.open_button = QPushButton("Open")
        self.new_button.clicked.connect(self.clear_form)
        self.save_button.clicked.connect(self.save_company)
        self.open_button.clicked.connect(self.open_company)
        button_row.addWidget(self.new_button)
        button_row.addWidget(self.save_button)
        button_row.addWidget(self.open_button)
        form_layout.addLayout(button_row)
        form_layout.addStretch(1)

        layout.addWidget(form_panel, 3)
        self.refresh()

    def refresh(self) -> None:
        companies = self.service.list_companies()
        self.table.setRowCount(len(companies))
        for row_index, company in enumerate(companies):
            values = [
                company["name"],
                company["address"],
                company["gst_number"],
                company["phone"],
                company["email"],
                company["fy_start"],
                company["fy_end"],
                str(company["id"]),
            ]
            for col_index, value in enumerate(values):
                self.table.setItem(row_index, col_index, QTableWidgetItem(value))
        self.table.resizeColumnsToContents()
        if companies and self.current_company_id is None:
            self._fill_form(companies[0])

    def clear_form(self) -> None:
        self.current_company_id = None
        self.name_edit.clear()
        self.address_edit.clear()
        self.gst_edit.clear()
        self.phone_edit.clear()
        self.email_edit.clear()
        today = QDate.currentDate()
        self.fy_start_edit.setDate(QDate(today.year(), 4, 1))
        self.fy_end_edit.setDate(QDate(today.year() + 1, 3, 31))

    def _load_selected_company(self) -> None:
        row = self.table.currentRow()
        if row < 0:
            return
        company_id_item = self.table.item(row, 7)
        if company_id_item is None:
            return
        company = self.service.get_company(int(company_id_item.text()))
        if company:
            self._fill_form(company)

    def _fill_form(self, company: dict) -> None:
        self.current_company_id = company["id"]
        self.name_edit.setText(company["name"])
        self.address_edit.setText(company["address"])
        self.gst_edit.setText(company["gst_number"])
        self.phone_edit.setText(company["phone"])
        self.email_edit.setText(company["email"])
        self.fy_start_edit.setDate(QDate.fromString(company["fy_start"], "yyyy-MM-dd"))
        self.fy_end_edit.setDate(QDate.fromString(company["fy_end"], "yyyy-MM-dd"))

    def _company_form_values(self) -> dict:
        return {
            "name": self.name_edit.text().strip(),
            "address": self.address_edit.text().strip(),
            "gst_number": self.gst_edit.text().strip(),
            "phone": self.phone_edit.text().strip(),
            "email": self.email_edit.text().strip(),
            "fy_start": self.fy_start_edit.date().toString("yyyy-MM-dd"),
            "fy_end": self.fy_end_edit.date().toString("yyyy-MM-dd"),
        }

    def save_company(self) -> None:
        values = self._company_form_values()
        if not values["name"]:
            QMessageBox.warning(self, "Company", "Company name is required.")
            return
        if self.current_company_id is None:
            company_id = self.service.create_company(**values)
            self.current_company_id = company_id
        else:
            self.service.update_company(self.current_company_id, **values)
        self.service.set_active_company(self.current_company_id)
        self.company_changed_callback()
        self.refresh()
        QMessageBox.information(self, "Company", "Company details saved.")

    def open_company(self) -> None:
        if self.current_company_id is None:
            QMessageBox.warning(self, "Company", "Select or save a company first.")
            return
        self.service.set_active_company(self.current_company_id)
        self.company_changed_callback()
        QMessageBox.information(self, "Company", "Company opened.")

