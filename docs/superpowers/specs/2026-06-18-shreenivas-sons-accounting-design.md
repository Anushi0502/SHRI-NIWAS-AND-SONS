# Shreenivas & Sons Accounting App Design

> Original desktop accounting software for Shreenivas & Sons, built in PyQt5 with a clean sidebar layout, local SQLite storage, and live accounting reports computed from voucher entries.

**Goal:** Replace manual accounting work with a self-contained desktop app for company setup, ledgers, vouchers, day book, reports, invoice generation, and backup/restore.

**Architecture:** Use a thin PyQt5 shell backed by a service layer over SQLite. All accounting reports derive from `voucher_entries` plus ledger opening balances; no report totals are stored separately. UI pages remain focused on forms and browsing, while accounting logic, exports, and file operations live in services.

**Tech Stack:** Python 3, PyQt5, SQLite, openpyxl, reportlab, pytest.

---

## Product Shape

The app will use an original layout, not a Tally clone:

- A dark left sidebar for navigation.
- A top header for company name and current financial year.
- A light content area with cards, tables, dialogs, and forms.
- Dedicated screens for company setup, ledgers, vouchers, day book, reports, invoices, and backups.

The app will open into the selected company, or seed a demo company named `Shreenivas & Sons` on first launch if no company exists yet.

## Core Modules

### Company Management

- Create and edit company details.
- Store name, address, GST number, phone, email, and financial year start/end dates.
- Select an existing company as the active company.

### Account Groups

Seed default groups:

- Assets
- Liabilities
- Capital
- Income
- Expense
- Sundry Debtors
- Sundry Creditors
- Cash-in-Hand
- Bank Accounts
- Sales Accounts
- Purchase Accounts
- Duties & Taxes

Each group carries a reporting category so ledgers can be classified into balance sheet, direct income, indirect income, direct expense, or indirect expense buckets.

### Ledger Management

- Create, edit, delete, and search ledgers.
- Store opening balance and opening balance type.
- Keep address, phone, and GST number with the ledger.
- Relate each ledger to a group.

### Voucher Entry

- Support Payment, Receipt, Sales, Purchase, Journal, and Contra vouchers.
- Allow multiple rows per voucher.
- Validate that total debit equals total credit.
- Reject negative or empty amounts.
- Require at least two rows.
- Store voucher headers and voucher entries only; no report totals are saved.

### Day Book

- Show vouchers date-wise.
- Filter by date range and voucher type.
- Open voucher details on double click.

### Reports

- Ledger Report
- Trial Balance
- Profit and Loss
- Balance Sheet

All reports are calculated from voucher entries plus opening balances. Export buttons write the current report to PDF and Excel.

### Invoice Module

- Create sales invoices with customer selection and item rows.
- Auto-calculate subtotal, tax, and grand total.
- Save each invoice as a voucher.
- Generate a printable PDF invoice with company details.

### Backup and Restore

- Back up the SQLite database file.
- Restore the database from a backup copy.

## Data Model

### Tables

- `companies`
- `account_groups`
- `ledgers`
- `vouchers`
- `voucher_entries`
- `invoices`
- `invoice_items`
- `app_settings`

### Money Handling

Amounts will be stored as integer paise in SQLite. The UI will accept rupee values, convert them to paise, and format them back for display. This avoids floating-point drift in accounting calculations.

### Report Logic

- Ledger opening balance is applied first.
- Debit adds to the running balance.
- Credit subtracts from the running balance.
- Trial balance shows each ledger closing balance as debit or credit.
- Profit and loss sums income and expense ledgers for the selected period and derives net profit or loss.
- Balance sheet combines assets, liabilities, capital, and the current period profit or loss so the statement balances.

## UI Flow

1. Start app.
2. Load active company or seed demo company.
3. Show dashboard summary cards.
4. Navigate with sidebar to ledgers, vouchers, day book, reports, invoices, or backup/restore.
5. Refresh live summaries after any save.

## Exports

- Excel exports use `openpyxl` with basic formatting and totals rows.
- PDF exports use `reportlab` tables and headings.
- Invoice PDFs include company details, invoice details, line items, and totals.

## Testing Strategy

Core behavior will be covered with pytest:

- Voucher validation rules.
- Ledger statement running balance.
- Trial balance totals.
- Profit and loss calculation.
- Balance sheet balancing.
- Invoice-to-voucher conversion.
- Excel/PDF export file creation.

GUI behavior will stay thin and be validated through service-level tests plus manual smoke checks.

## Open Assumptions

- The app is an integrated MVP, not split into phases.
- The UI will be original and modern, but intentionally simple enough to maintain in PyQt5.
- A demo company and sample accounting data will be available from first launch or an explicit seed path.
