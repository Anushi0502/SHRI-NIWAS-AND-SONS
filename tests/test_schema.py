from pathlib import Path

from shreenivas_sons.db import Database


def test_initialize_schema_creates_default_groups(tmp_path):
    db_path = tmp_path / "accounting.db"
    database = Database(db_path)
    database.initialize()

    groups = database.list_groups()
    names = {group["name"] for group in groups}

    assert "Assets" in names
    assert "Sales Accounts" in names
    assert "Duties & Taxes" in names


def test_database_initializes_app_settings_table(tmp_path):
    db_path = tmp_path / "accounting.db"
    database = Database(db_path)
    database.initialize()

    settings = database.list_settings()
    assert any(setting["setting_key"] == "active_company_id" for setting in settings)
