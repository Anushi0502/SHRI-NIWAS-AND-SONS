from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _round_paise(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def calculate_invoice_items(items: list[dict]) -> list[dict]:
    calculated: list[dict] = []
    for sort_order, item in enumerate(items):
        quantity = Decimal(str(item.get("quantity", 0)))
        rate_paise = int(item.get("rate_paise", 0))
        tax_rate_percent = Decimal(str(item.get("tax_rate_percent", 0)))
        line_total_paise = _round_paise(quantity * Decimal(rate_paise))
        tax_amount_paise = _round_paise(Decimal(line_total_paise) * tax_rate_percent / Decimal(100))
        total_paise = line_total_paise + tax_amount_paise
        calculated.append(
            {
                "sort_order": sort_order,
                "item_name": item.get("item_name", ""),
                "quantity": float(quantity),
                "rate_paise": rate_paise,
                "tax_rate_percent": float(tax_rate_percent),
                "line_total_paise": line_total_paise,
                "tax_amount_paise": tax_amount_paise,
                "total_paise": total_paise,
            }
        )
    return calculated


def save_invoice(
    service,
    company_id: int,
    invoice_no: str,
    invoice_date: str,
    customer_ledger_id: int,
    items: list[dict],
    narration: str = "",
) -> int:
    calculated_items = calculate_invoice_items(items)
    subtotal_paise = sum(item["line_total_paise"] for item in calculated_items)
    tax_total_paise = sum(item["tax_amount_paise"] for item in calculated_items)
    grand_total_paise = subtotal_paise + tax_total_paise

    sales_ledger_id = service._first_ledger_id_in_group(company_id, "Sales Accounts")
    tax_ledger_id = service._first_ledger_id_in_group(company_id, "Duties & Taxes")

    with service.db.connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO invoices(
                company_id, invoice_no, invoice_date, customer_ledger_id,
                subtotal_paise, tax_total_paise, grand_total_paise, narration
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                company_id,
                invoice_no,
                invoice_date,
                customer_ledger_id,
                subtotal_paise,
                tax_total_paise,
                grand_total_paise,
                narration,
            ),
        )
        invoice_id = cursor.lastrowid

        for item in calculated_items:
            conn.execute(
                """
                INSERT INTO invoice_items(
                    invoice_id, sort_order, item_name, quantity, rate_paise,
                    tax_rate_percent, line_total_paise, tax_amount_paise, total_paise
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    invoice_id,
                    item["sort_order"],
                    item["item_name"],
                    item["quantity"],
                    item["rate_paise"],
                    item["tax_rate_percent"],
                    item["line_total_paise"],
                    item["tax_amount_paise"],
                    item["total_paise"],
                ),
            )

    voucher_id = service.save_voucher(
        company_id=company_id,
        voucher_type="Sales",
        voucher_no=invoice_no,
        voucher_date=invoice_date,
        narration=narration or f"Sales invoice {invoice_no}",
        rows=[
            {"ledger_id": customer_ledger_id, "debit_paise": grand_total_paise, "credit_paise": 0},
            {"ledger_id": sales_ledger_id, "debit_paise": 0, "credit_paise": subtotal_paise},
            {"ledger_id": tax_ledger_id, "debit_paise": 0, "credit_paise": tax_total_paise},
        ],
    )

    with service.db.connect() as conn:
        conn.execute("UPDATE invoices SET voucher_id = ? WHERE id = ?", (voucher_id, invoice_id))

    return invoice_id


def generate_invoice_pdf(service, invoice_id: int, path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    invoice = service.db.fetchone(
        """
        SELECT i.*, c.name AS company_name, c.address, c.gst_number, c.phone, c.email,
               l.name AS customer_name
        FROM invoices i
        JOIN companies c ON c.id = i.company_id
        JOIN ledgers l ON l.id = i.customer_ledger_id
        WHERE i.id = ?
        """,
        (invoice_id,),
    )
    if invoice is None:
        raise ValueError("Invoice not found")

    items = service.db.fetchall(
        "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order",
        (invoice_id,),
    )

    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(path), pagesize=letter, leftMargin=24, rightMargin=24, topMargin=24, bottomMargin=24)
    story = [
        Paragraph(invoice["company_name"], styles["Title"]),
        Paragraph(f"Invoice No: {invoice['invoice_no']}", styles["Heading3"]),
        Paragraph(f"Date: {invoice['invoice_date']}", styles["Normal"]),
        Paragraph(f"Billed To: {invoice['customer_name']}", styles["Normal"]),
        Spacer(1, 12),
    ]

    table_data = [["Item", "Qty", "Rate", "Tax", "Total"]]
    for item in items:
        table_data.append(
            [
                item["item_name"],
                f"{item['quantity']}",
                f"{item['rate_paise'] / 100:.2f}",
                f"{item['tax_amount_paise'] / 100:.2f}",
                f"{item['total_paise'] / 100:.2f}",
            ]
        )
    table_data.append(["", "", "Subtotal", "", f"{invoice['subtotal_paise'] / 100:.2f}"])
    table_data.append(["", "", "Tax", "", f"{invoice['tax_total_paise'] / 100:.2f}"])
    table_data.append(["", "", "Grand Total", "", f"{invoice['grand_total_paise'] / 100:.2f}"])

    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F4E79")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey]),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ]
        )
    )
    story.append(table)
    doc.build(story)

