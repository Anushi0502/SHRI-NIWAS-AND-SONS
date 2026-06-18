from pathlib import Path

from openpyxl import load_workbook

from shreenivas_sons.services.exports import export_table_to_excel, export_table_to_pdf


def test_export_helpers_create_files(tmp_path):
    excel_path = tmp_path / "trial_balance.xlsx"
    pdf_path = tmp_path / "trial_balance.pdf"
    rows = [["Cash", 1000, 0], ["Sales", 0, 1000]]

    export_table_to_excel(excel_path, "Trial Balance", ["Ledger", "Debit", "Credit"], rows)
    export_table_to_pdf(pdf_path, "Trial Balance", ["Ledger", "Debit", "Credit"], rows)

    assert excel_path.exists()
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 0

    workbook = load_workbook(excel_path)
    sheet = workbook.active
    assert sheet["A1"].value == "Trial Balance"
    assert sheet["A3"].value == "Ledger"
