from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterable

from .schema import DEFAULT_GROUPS, SCHEMA_SQL


class Database:
    def __init__(self, path: str | Path):
        self.path = Path(path)

    @contextmanager
    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def initialize(self) -> None:
        with self.connect() as conn:
            conn.executescript(SCHEMA_SQL)
            self._seed_groups(conn)
            self._seed_settings(conn)

    def _seed_groups(self, conn: sqlite3.Connection) -> None:
        for name, parent_name, report_category in DEFAULT_GROUPS:
            conn.execute(
                """
                INSERT OR IGNORE INTO account_groups(name, parent_name, report_category)
                VALUES (?, ?, ?)
                """,
                (name, parent_name, report_category),
            )

    def _seed_settings(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            "INSERT OR IGNORE INTO app_settings(setting_key, setting_value) VALUES (?, ?)",
            ("active_company_id", ""),
        )

    def list_groups(self) -> list[sqlite3.Row]:
        with self.connect() as conn:
            return conn.execute("SELECT * FROM account_groups ORDER BY name").fetchall()

    def list_settings(self) -> list[sqlite3.Row]:
        with self.connect() as conn:
            return conn.execute("SELECT * FROM app_settings ORDER BY setting_key").fetchall()

    def execute(self, sql: str, params: Iterable | tuple = ()) -> None:
        with self.connect() as conn:
            conn.execute(sql, tuple(params))

    def fetchone(self, sql: str, params: Iterable | tuple = ()) -> sqlite3.Row | None:
        with self.connect() as conn:
            return conn.execute(sql, tuple(params)).fetchone()

    def fetchall(self, sql: str, params: Iterable | tuple = ()) -> list[sqlite3.Row]:
        with self.connect() as conn:
            return conn.execute(sql, tuple(params)).fetchall()

