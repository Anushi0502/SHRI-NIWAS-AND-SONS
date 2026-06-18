from __future__ import annotations

import shutil
from pathlib import Path


def backup_database(source_path, backup_path) -> None:
    source = Path(source_path)
    backup = Path(backup_path)
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, backup)


def restore_database(backup_path, destination_path) -> None:
    backup = Path(backup_path)
    destination = Path(destination_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(backup, destination)

