# Shreenivas & Sons Accounting App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an original PyQt5 desktop accounting app for Shreenivas & Sons with company setup, ledgers, double-entry vouchers, day book, reports, invoice generation, and backup/restore.

**Architecture:** Keep the UI thin and use a SQLite-backed accounting service layer for all persistence and report calculations. Store money as integer paise, compute all reports from `voucher_entries` plus opening balances, and keep exports in dedicated helpers so the GUI only asks for data and displays results.

**Tech Stack:** Python 3, PyQt5, SQLite, openpyxl, reportlab, pytest.

---

### Task 1: Project Scaffold, Money Helpers, and Database Schema

**Files:**
- Create: `run.py`
- Create: `shreenivas_sons/__init__.py`
- Create: `shreenivas_sons/config.py`
- Create: `shreenivas_sons/utils/money.py`
- Create: `shreenivas_sons/schema.py`
- Create: `shreenivas_sons/db.py`
- Create: `shreenivas_sons/models.py`
- Create: `tests/test_money.py`

- [ ] **Step 1: Write the failing test**

```python
from decimal import Decimal
from shreenivas_sons.utils.money import money_to_paise, paise_to_money


def test_money_round_trip():
    assert money_to_paise("123.45") == 12345
    assert paise_to_money(12345) == Decimal("123.45")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_money.py -v`
Expected: FAIL because the package and helper functions do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```python
from decimal import Decimal, ROUND_HALF_UP


def money_to_paise(value) -> int:
    amount = Decimal(str(value))
    return int((amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def paise_to_money(value: int) -> Decimal:
    return (Decimal(value) / Decimal(100)).quantize(Decimal("0.01"))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_money.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add run.py shreenivas_sons tests/test_money.py
git commit -m "feat: scaffold accounting app core"
```

### Task 2: Voucher Validation and Ledger Statement Logic

**Files:**
- Create: `shreenivas_sons/services/accounting.py`
- Create: `tests/test_voucher_validation.py`
- Create: `tests/test_ledger_statement.py`

- [ ] **Step 1: Write the failing test**

```python
from datetime import date
import pytest
from shreenivas_sons.services.accounting import validate_voucher_rows


def test_rejects_unbalanced_voucher_rows():
    rows = [
        {"ledger_id": 1, "debit_paise": 1000, "credit_paise": 0},
        {"ledger_id": 2, "debit_paise": 0, "credit_paise": 900},
    ]

    with pytest.raises(ValueError, match="debit and credit totals do not match"):
        validate_voucher_rows(rows)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_voucher_validation.py -v`
Expected: FAIL because validation is missing.

- [ ] **Step 3: Write minimal implementation**

```python
def validate_voucher_rows(rows):
    if len(rows) < 2:
        raise ValueError("At least two ledger entries are required")
    debit = sum(row["debit_paise"] for row in rows)
    credit = sum(row["credit_paise"] for row in rows)
    if debit <= 0 or credit <= 0:
        raise ValueError("Voucher totals must be positive")
    if debit != credit:
        raise ValueError("Voucher debit and credit totals do not match")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_voucher_validation.py tests/test_ledger_statement.py -v`
Expected: PASS after adding the ledger statement logic and its fixtures.

- [ ] **Step 5: Commit**

```bash
git add shreenivas_sons/services/accounting.py tests/test_voucher_validation.py tests/test_ledger_statement.py
git commit -m "feat: add voucher validation and ledger statements"
```

### Task 3: Trial Balance, Profit and Loss, and Balance Sheet

**Files:**
- Modify: `shreenivas_sons/services/accounting.py`
- Create: `tests/test_reports.py`

- [ ] **Step 1: Write the failing test**

```python
def test_trial_balance_totals_match(sample_service):
    report = sample_service.trial_balance(as_on="2026-06-18")
    assert report["totals"]["debit_paise"] == report["totals"]["credit_paise"]


def test_profit_and_loss_returns_net_profit(sample_service):
    report = sample_service.profit_and_loss("2026-04-01", "2026-06-18")
    assert "net_profit_paise" in report


def test_balance_sheet_balances(sample_service):
    report = sample_service.balance_sheet("2026-06-18")
    assert report["totals"]["assets_paise"] == report["totals"]["liabilities_plus_capital_paise"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_reports.py -v`
Expected: FAIL until the calculations exist.

- [ ] **Step 3: Write minimal implementation**

```python
def trial_balance(self, as_on):
    ledgers = self._ledger_balances(as_on)
    rows = []
    debit_total = 0
    credit_total = 0
    for ledger in ledgers:
        balance = ledger["balance_paise"]
        debit_paise = balance if balance > 0 else 0
        credit_paise = -balance if balance < 0 else 0
        debit_total += debit_paise
        credit_total += credit_paise
        rows.append((ledger["ledger_name"], debit_paise, credit_paise))
    return {"rows": rows, "totals": {"debit_paise": debit_total, "credit_paise": credit_total}}

def profit_and_loss(self, start_date, end_date):
    income_paise = self._sum_category("income", start_date, end_date)
    expense_paise = self._sum_category("expense", start_date, end_date)
    net_profit_paise = income_paise - expense_paise
    return {"income_paise": income_paise, "expense_paise": expense_paise, "net_profit_paise": net_profit_paise}

def balance_sheet(self, as_on):
    assets_paise = self._sum_category("asset", None, as_on)
    liabilities_paise = self._sum_category("liability", None, as_on)
    capital_paise = self._sum_category("capital", None, as_on)
    net_profit_paise = self.profit_and_loss(self.financial_year_start(as_on), as_on)["net_profit_paise"]
    return {
        "totals": {
            "assets_paise": assets_paise,
            "liabilities_plus_capital_paise": liabilities_paise + capital_paise + net_profit_paise,
        }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_reports.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shreenivas_sons/services/accounting.py tests/test_reports.py
git commit -m "feat: implement accounting reports"
```

### Task 4: Company, Ledger, Voucher, and Seed Data Persistence

**Files:**
- Modify: `shreenivas_sons/db.py`
- Modify: `shreenivas_sons/schema.py`
- Modify: `shreenivas_sons/models.py`
- Modify: `shreenivas_sons/services/accounting.py`
- Create: `shreenivas_sons/sample_data.py`
- Create: `tests/test_persistence.py`

- [ ] **Step 1: Write the failing test**

```python
def test_seed_data_creates_demo_company(sample_database):
    companies = sample_database.list_companies()
    assert companies[0]["name"] == "Shreenivas & Sons"
    assert sample_database.list_default_groups()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_persistence.py -v`
Expected: FAIL until schema, CRUD, and seed logic exist.

- [ ] **Step 3: Write minimal implementation**

```python
def ensure_schema(conn):
    conn.executescript(SCHEMA_SQL)


def seed_default_groups(conn):
    groups = [
        ("Assets", None, "asset"),
        ("Liabilities", None, "liability"),
        ("Capital", None, "capital"),
        ("Income", None, "income"),
        ("Expense", None, "expense"),
        ("Sundry Debtors", "Assets", "asset"),
        ("Sundry Creditors", "Liabilities", "liability"),
        ("Cash-in-Hand", "Assets", "asset"),
        ("Bank Accounts", "Assets", "asset"),
        ("Sales Accounts", "Income", "income"),
        ("Purchase Accounts", "Expense", "expense"),
        ("Duties & Taxes", "Liabilities", "liability"),
    ]
    for name, parent_name, report_category in groups:
        conn.execute(
            "INSERT OR IGNORE INTO account_groups(name, parent_name, report_category) VALUES (?, ?, ?)",
            (name, parent_name, report_category),
        )


def seed_demo_company(service):
    if service.list_companies():
        return
    company_id = service.create_company(
        name="Shreenivas & Sons",
        address="",
        gst_number="",
        phone="",
        email="",
        fy_start="2026-04-01",
        fy_end="2027-03-31",
    )
    service.seed_sample_ledgers(company_id)
    service.seed_sample_vouchers(company_id)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_persistence.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shreenivas_sons/db.py shreenivas_sons/schema.py shreenivas_sons/models.py shreenivas_sons/sample_data.py tests/test_persistence.py
git commit -m "feat: add persistence and demo seed data"
```

### Task 5: Excel and PDF Export Helpers

**Files:**
- Create: `shreenivas_sons/services/exports.py`
- Create: `tests/test_exports.py`

- [ ] **Step 1: Write the failing test**

```python
from pathlib import Path
from shreenivas_sons.services.exports import export_table_to_excel, export_table_to_pdf


def test_export_helpers_create_files(tmp_path):
    excel_path = tmp_path / "trial_balance.xlsx"
    pdf_path = tmp_path / "trial_balance.pdf"
    rows = [["Cash", 1000, 0], ["Sales", 0, 1000]]

    export_table_to_excel(excel_path, "Trial Balance", ["Ledger", "Debit", "Credit"], rows)
    export_table_to_pdf(pdf_path, "Trial Balance", ["Ledger", "Debit", "Credit"], rows)

    assert excel_path.exists()
    assert pdf_path.exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_exports.py -v`
Expected: FAIL until export helpers are implemented.

- [ ] **Step 3: Write minimal implementation**

```python
def export_table_to_excel(path, title, headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.title = "Report"
    ws.append([title])
    ws.append([])
    ws.append(list(headers))
    for row in rows:
        ws.append(list(row))
    wb.save(path)

def export_table_to_pdf(path, title, headers, rows):
    doc = SimpleDocTemplate(str(path), pagesize=letter)
    story = [Paragraph(title, getSampleStyleSheet()["Title"]), Spacer(1, 12)]
    table_data = [list(headers)] + [list(row) for row in rows]
    story.append(Table(table_data))
    doc.build(story)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_exports.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shreenivas_sons/services/exports.py tests/test_exports.py
git commit -m "feat: add excel and pdf export helpers"
```

### Task 6: Invoice Conversion and Printable PDF Invoice

**Files:**
- Create: `shreenivas_sons/services/invoices.py`
- Create: `tests/test_invoices.py`
- Create: `shreenivas_sons/ui/pages/invoice_page.py`

- [ ] **Step 1: Write the failing test**

```python
def test_invoice_saves_as_sales_voucher(sample_service):
    invoice_id = sample_service.save_invoice(
        customer_ledger_id=10,
        invoice_no="INV-0001",
        invoice_date="2026-06-18",
        items=[{"name": "Item A", "qty": 2, "rate_paise": 5000, "tax_rate": 18}],
    )
    assert invoice_id > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_invoices.py -v`
Expected: FAIL until invoice persistence and voucher creation exist.

- [ ] **Step 3: Write minimal implementation**

```python
def save_invoice(self, company_id, invoice_no, invoice_date, customer_ledger_id, items, narration=""):
    subtotal_paise = sum(item["qty_paise"] * item["rate_paise"] // 100 for item in items)
    tax_total_paise = sum(item["tax_amount_paise"] for item in items)
    grand_total_paise = subtotal_paise + tax_total_paise
    invoice_id = self._insert_invoice_header(
        company_id, invoice_no, invoice_date, customer_ledger_id, subtotal_paise, tax_total_paise, grand_total_paise, narration
    )
    self._insert_invoice_items(invoice_id, items)
    self.save_voucher(
        company_id=company_id,
        voucher_type="Sales",
        voucher_no=self._generate_voucher_no(company_id, "Sales", invoice_date),
        voucher_date=invoice_date,
        narration=narration or f"Sales invoice {invoice_no}",
        rows=[
            {"ledger_id": customer_ledger_id, "debit_paise": grand_total_paise, "credit_paise": 0},
            {"ledger_id": self._sales_ledger_id(company_id), "debit_paise": 0, "credit_paise": subtotal_paise},
            {"ledger_id": self._output_tax_ledger_id(company_id), "debit_paise": 0, "credit_paise": tax_total_paise},
        ],
    )
    return invoice_id
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_invoices.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shreenivas_sons/services/invoices.py shreenivas_sons/ui/pages/invoice_page.py tests/test_invoices.py
git commit -m "feat: add invoice workflow"
```

### Task 7: PyQt5 Shell, Sidebar Navigation, and Core Pages

**Files:**
- Create: `shreenivas_sons/app.py`
- Create: `shreenivas_sons/ui/main_window.py`
- Create: `shreenivas_sons/ui/styles.py`
- Create: `shreenivas_sons/ui/dialogs.py`
- Create: `shreenivas_sons/ui/pages/dashboard_page.py`
- Create: `shreenivas_sons/ui/pages/company_page.py`
- Create: `shreenivas_sons/ui/pages/ledger_page.py`
- Create: `shreenivas_sons/ui/pages/voucher_page.py`
- Create: `shreenivas_sons/ui/pages/daybook_page.py`
- Create: `shreenivas_sons/ui/pages/reports_page.py`
- Create: `shreenivas_sons/ui/pages/backup_page.py`
- Create: `tests/test_ui_imports.py`

- [ ] **Step 1: Write the failing test**

```python
def test_ui_modules_import_cleanly():
    import shreenivas_sons.ui.main_window
    import shreenivas_sons.ui.pages.dashboard_page
    import shreenivas_sons.ui.pages.ledger_page
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_ui_imports.py -v`
Expected: FAIL until PyQt5 is installed and the modules exist.

- [ ] **Step 3: Write minimal implementation**

```python
class MainWindow(QMainWindow):
    def __init__(self, app_service):
        super().__init__()
        self.app_service = app_service
        self.sidebar = QListWidget()
        self.stack = QStackedWidget()
        self.dashboard_page = DashboardPage(app_service)
        self.ledger_page = LedgerPage(app_service)
        self.stack.addWidget(self.dashboard_page)
        self.stack.addWidget(self.ledger_page)
        self._apply_styles()
        self._bind_navigation()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_ui_imports.py -v`
Expected: PASS, then do a manual launch smoke test.

- [ ] **Step 5: Commit**

```bash
git add shreenivas_sons/app.py shreenivas_sons/ui tests/test_ui_imports.py
git commit -m "feat: build desktop ui shell"
```

### Task 8: Backup, Restore, README, and Final Verification

**Files:**
- Create: `README.md`
- Create: `requirements.txt`
- Create: `.gitignore`
- Modify: `shreenivas_sons/services/accounting.py`
- Modify: `shreenivas_sons/services/exports.py`
- Modify: `shreenivas_sons/app.py`

- [ ] **Step 1: Write the failing test**

```python
def test_backup_and_restore_round_trip(tmp_path, sample_service):
    backup_path = tmp_path / "backup.db"
    sample_service.backup_database(backup_path)
    assert backup_path.exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_backup_restore.py -v`
Expected: FAIL until backup/restore logic exists.

- [ ] **Step 3: Write minimal implementation**

```python
def backup_database(source_path, target_path):
    shutil.copy2(source_path, target_path)


def restore_database(target_path, source_path):
    shutil.copy2(source_path, target_path)
```

- [ ] **Step 4: Run tests and a smoke launch**

Run:

```bash
pytest -v
python run.py
```

Expected: all tests pass, app opens, seeded company loads, and the main screens render.

- [ ] **Step 5: Commit**

```bash
git add README.md requirements.txt .gitignore shreenivas_sons
git commit -m "feat: finish accounting desktop app"
```

## Review Checklist

- Reports are derived from `voucher_entries` plus opening balances.
- Voucher validation blocks unbalanced entries.
- Sample data exists for testing.
- The UI is original and not a Tally copy.
- Each major subsystem has tests before implementation.
