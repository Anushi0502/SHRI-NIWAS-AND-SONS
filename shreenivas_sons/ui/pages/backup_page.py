from __future__ import annotations

from PyQt5.QtWidgets import QFileDialog, QHBoxLayout, QMessageBox, QPushButton, QVBoxLayout, QWidget


class BackupPage(QWidget):
    def __init__(self, service, parent=None):
        super().__init__(parent)
        self.service = service
        layout = QVBoxLayout(self)

        button_row = QHBoxLayout()
        self.backup_button = QPushButton("Backup Database")
        self.restore_button = QPushButton("Restore Database")
        self.backup_button.clicked.connect(self.backup_database)
        self.restore_button.clicked.connect(self.restore_database)
        button_row.addWidget(self.backup_button)
        button_row.addWidget(self.restore_button)
        layout.addLayout(button_row)
        layout.addStretch(1)

    def backup_database(self) -> None:
        path, _ = QFileDialog.getSaveFileName(self, "Backup Database", "shreenivas_sons_backup.db", "SQLite DB (*.db)")
        if not path:
            return
        self.service.backup_database(path)
        QMessageBox.information(self, "Backup", f"Database backed up to {path}")

    def restore_database(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "Restore Database", "", "SQLite DB (*.db)")
        if not path:
            return
        self.service.restore_database(path)
        QMessageBox.information(self, "Restore", "Database restored. Reload the app to refresh open pages.")

