# Global Creative Services Accounting

Desktop accounting software for a local business workflow, built with Python 3, PyQt5, SQLite, openpyxl, and reportlab.

## Features

- Company management
- Default accounting groups
- Ledger create/edit/delete/search
- Double-entry voucher entry
- Day book
- Ledger report
- Trial balance
- Profit and loss
- Balance sheet
- Sales invoice module with PDF output
- Backup and restore for the SQLite database

## Project Structure

```text
run.py
requirements.txt
shreenivas_sons/
  app.py
  config.py
  db.py
  models.py
  sample_data.py
  schema.py
  services/
    accounting.py
    backup.py
    exports.py
    invoices.py
  ui/
    dialogs.py
    main_window.py
    pages/
      backup_page.py
      company_page.py
      dashboard_page.py
      daybook_page.py
      invoice_page.py
      ledger_page.py
      reports_page.py
      voucher_page.py
    styles.py
    widgets.py
  utils/
    money.py
tests/
```

## Run It

1. Create or activate a Python 3.12 virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Launch the app:

```bash
python run.py
```

On first launch, the app seeds a demo company named `Global Creative Services` with sample ledgers and vouchers so the reports have live data immediately.

## Sample Data

The seeded data includes:

- Cash
- Sales
- Office Expense
- Capital
- ABC Traders
- Output GST

It also includes balanced sample vouchers so the dashboard, reports, and invoice flow all have realistic starting values.

## Accounting Logic

### Trial Balance

- Each ledger balance is computed from its opening balance plus voucher entries.
- Debit entries add to the balance.
- Credit entries subtract from the balance.
- Each ledger is placed into the debit or credit column based on its closing balance sign.
- Total debit and total credit must match.

### Profit and Loss

- Income ledgers are summed as credit-normal values.
- Expense ledgers are summed as debit-normal values.
- Net profit = total income - total expense.
- Net loss appears as a negative profit value.

### Balance Sheet

- Asset, liability, and capital ledgers are calculated as of the selected date.
- The current period profit or loss is added into capital on the liabilities side.
- Total assets must equal total liabilities plus capital after profit/loss impact.

## Reports and Exports

- Excel exports use `openpyxl`.
- PDF exports use `reportlab`.
- Invoice PDFs are generated automatically after saving an invoice.

## Backup and Restore

- Backup copies the SQLite database to a chosen file.
- Restore replaces the live database with a selected backup file.

## Tests

Run the full suite:

```bash
pytest -v
```
