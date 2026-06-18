APP_STYLE = """
QMainWindow {
    background: #f3f6fb;
}

QWidget {
    font-family: "Segoe UI";
    font-size: 10pt;
}

QFrame#Sidebar {
    background: #10233f;
    color: white;
}

QLabel#BrandTitle {
    color: white;
    font-size: 18pt;
    font-weight: 700;
}

QLabel#BrandSubTitle {
    color: #b7c6dd;
}

QPushButton#NavButton {
    background: transparent;
    color: #dbe7ff;
    border: none;
    text-align: left;
    padding: 10px 14px;
    border-radius: 10px;
}

QPushButton#NavButton:hover {
    background: rgba(255, 255, 255, 0.08);
}

QPushButton#NavButton:checked {
    background: #2563eb;
    color: white;
}

QFrame#Card {
    background: white;
    border-radius: 14px;
    border: 1px solid #dbe4f0;
}

QLabel#CardTitle {
    color: #64748b;
    font-size: 9pt;
    text-transform: uppercase;
}

QLabel#CardValue {
    color: #0f172a;
    font-size: 18pt;
    font-weight: 700;
}

QTableWidget {
    background: white;
    alternate-background-color: #f8fbff;
    gridline-color: #dbe4f0;
    border: 1px solid #dbe4f0;
    border-radius: 10px;
}

QHeaderView::section {
    background: #e8eef8;
    color: #0f172a;
    padding: 8px;
    border: none;
    border-bottom: 1px solid #dbe4f0;
    font-weight: 600;
}

QLineEdit, QComboBox, QDateEdit, QDoubleSpinBox, QSpinBox, QTextEdit {
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 7px 9px;
}

QPushButton {
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 600;
}

QPushButton:hover {
    background: #1d4ed8;
}

QPushButton:disabled {
    background: #94a3b8;
}
"""

