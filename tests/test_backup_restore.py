from shreenivas_sons.services.accounting import AccountingService


def test_backup_and_restore_round_trip(tmp_path, sample_service):
    backup_path = tmp_path / "backup.db"

    sample_service.backup_database(backup_path)
    assert backup_path.exists()

    sample_service.create_company(
        name="Temporary Company",
        address="",
        gst_number="",
        phone="",
        email="",
        fy_start="2026-04-01",
        fy_end="2027-03-31",
    )
    assert len(sample_service.list_companies()) == 2

    sample_service.restore_database(backup_path)

    companies = sample_service.list_companies()
    assert len(companies) == 1
    assert companies[0]["name"] == "Global Creative Services"
