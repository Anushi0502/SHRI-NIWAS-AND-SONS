from __future__ import annotations

from PyQt5.QtWidgets import QDialog, QFormLayout, QLabel, QPushButton, QTableWidget, QVBoxLayout

from .widgets import set_table_data


class VoucherDetailDialog(QDialog):
    def __init__(self, voucher_detail: dict, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Voucher Details")
        layout = QVBoxLayout(self)

        voucher = voucher_detail["voucher"]
        form = QFormLayout()
        form.addRow("Voucher No", QLabel(voucher["voucher_no"]))
        form.addRow("Date", QLabel(voucher["voucher_date"]))
        form.addRow("Type", QLabel(voucher["voucher_type"]))
        form.addRow("Narration", QLabel(voucher["narration"]))
        layout.addLayout(form)

        self.table = QTableWidget()
        set_table_data(
            self.table,
            ["Ledger", "Debit", "Credit"],
            [
                [
                    row["ledger_name"],
                    f"{row['debit_paise'] / 100:.2f}",
                    f"{row['credit_paise'] / 100:.2f}",
                ]
                for row in voucher_detail["rows"]
            ],
        )
        layout.addWidget(self.table)

        close_button = QPushButton("Close")
        close_button.clicked.connect(self.accept)
        layout.addWidget(close_button)

