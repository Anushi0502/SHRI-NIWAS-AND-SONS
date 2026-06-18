from __future__ import annotations

import sys

from PyQt5.QtWidgets import QApplication

from .config import APP_NAME, DB_PATH
from .sample_data import seed_demo_data
from .services.accounting import AccountingService
from .ui.main_window import MainWindow


def build_service() -> AccountingService:
    service = AccountingService(DB_PATH)
    service.initialize()
    seed_demo_data(service)
    return service


def main() -> int:
    app = QApplication.instance() or QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    service = build_service()
    window = MainWindow(service)
    window.show()
    return app.exec_()


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

