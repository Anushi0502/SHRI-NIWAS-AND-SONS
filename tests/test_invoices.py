from pathlib import Path

from shreenivas_sons.services.accounting import AccountingService


def test_invoice_saves_as_sales_voucher(sample_service, tmp_path):
    invoice_id = sample_service.save_invoice(
        company_id=sample_service.company_id,
        invoice_no="INV-0001",
        invoice_date="2026-04-20",
        customer_ledger_id=sample_service.ledger_ids["debtor"],
        narration="Test invoice",
        items=[
            {"item_name": "Widget A", "quantity": 2, "rate_paise": 5000, "tax_rate_percent": 18},
        ],
    )

    invoice_row = sample_service.db.fetchone("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
    assert invoice_row is not None
    assert invoice_row["grand_total_paise"] == 11800

    voucher_row = sample_service.db.fetchone("SELECT * FROM vouchers WHERE id = ?", (invoice_row["voucher_id"],))
    assert voucher_row is not None
    assert voucher_row["voucher_type"] == "Sales"

    entry_rows = sample_service.db.fetchall(
        "SELECT * FROM voucher_entries WHERE voucher_id = ? ORDER BY sort_order",
        (invoice_row["voucher_id"],),
    )
    assert len(entry_rows) == 3


def test_invoice_pdf_is_generated(sample_service, tmp_path):
    invoice_id = sample_service.save_invoice(
        company_id=sample_service.company_id,
        invoice_no="INV-0002",
        invoice_date="2026-04-21",
        customer_ledger_id=sample_service.ledger_ids["debtor"],
        narration="Invoice for PDF",
        items=[
            {"item_name": "Widget B", "quantity": 1, "rate_paise": 10000, "tax_rate_percent": 18},
        ],
    )

    pdf_path = tmp_path / "invoice.pdf"
    sample_service.generate_invoice_pdf(invoice_id, pdf_path)

    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 0
