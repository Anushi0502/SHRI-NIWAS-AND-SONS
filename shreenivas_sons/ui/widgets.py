from __future__ import annotations

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import QFrame, QHBoxLayout, QLabel, QTableWidget, QTableWidgetItem, QVBoxLayout, QWidget

from ..utils.money import format_money


class StatCard(QFrame):
    def __init__(self, title: str, value: str = "", parent=None):
        super().__init__(parent)
        self.setObjectName("Card")
        layout = QVBoxLayout(self)
        self.title_label = QLabel(title)
        self.title_label.setObjectName("CardTitle")
        self.value_label = QLabel(value)
        self.value_label.setObjectName("CardValue")
        layout.addWidget(self.title_label)
        layout.addWidget(self.value_label)
        layout.addStretch(1)

    def set_value(self, value: str) -> None:
        self.value_label.setText(value)


def create_table(column_count: int) -> QTableWidget:
    table = QTableWidget()
    table.setAlternatingRowColors(True)
    table.setColumnCount(column_count)
    table.setEditTriggers(QTableWidget.NoEditTriggers)
    table.setSelectionBehavior(QTableWidget.SelectRows)
    table.setSelectionMode(QTableWidget.SingleSelection)
    table.verticalHeader().setVisible(False)
    table.setSortingEnabled(False)
    return table


def set_table_data(table: QTableWidget, headers: list[str], rows: list[list]) -> None:
    table.setSortingEnabled(False)
    table.clear()
    table.setColumnCount(len(headers))
    table.setHorizontalHeaderLabels(headers)
    table.setRowCount(len(rows))
    for row_index, row in enumerate(rows):
        for column_index, value in enumerate(row):
            item = QTableWidgetItem(str(value))
            if isinstance(value, (int, float)) or str(value).replace(".", "", 1).isdigit():
                item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
            table.setItem(row_index, column_index, item)
    table.resizeColumnsToContents()
    table.setSortingEnabled(True)
    table._table_headers = headers  # type: ignore[attr-defined]
    table._table_rows = rows  # type: ignore[attr-defined]


def table_data(table: QTableWidget) -> tuple[list[str], list[list]]:
    return getattr(table, "_table_headers", []), getattr(table, "_table_rows", [])


def money_text(paise: int) -> str:
    return format_money(int(paise))

