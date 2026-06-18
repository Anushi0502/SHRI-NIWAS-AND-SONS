SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS account_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    parent_name TEXT,
    report_category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL DEFAULT '',
    gst_number TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    fy_start TEXT NOT NULL,
    fy_end TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ledgers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    opening_balance_paise INTEGER NOT NULL DEFAULT 0,
    opening_balance_type TEXT NOT NULL DEFAULT 'Dr',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    gst_number TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, name),
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    voucher_no TEXT NOT NULL,
    voucher_type TEXT NOT NULL,
    voucher_date TEXT NOT NULL,
    narration TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, voucher_no),
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS voucher_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_id INTEGER NOT NULL,
    ledger_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    debit_paise INTEGER NOT NULL DEFAULT 0,
    credit_paise INTEGER NOT NULL DEFAULT 0,
    narration TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (debit_paise > 0 AND credit_paise = 0) OR
        (debit_paise = 0 AND credit_paise > 0)
    ),
    FOREIGN KEY(voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
    FOREIGN KEY(ledger_id) REFERENCES ledgers(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    invoice_no TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    customer_ledger_id INTEGER NOT NULL,
    subtotal_paise INTEGER NOT NULL DEFAULT 0,
    tax_total_paise INTEGER NOT NULL DEFAULT 0,
    grand_total_paise INTEGER NOT NULL DEFAULT 0,
    narration TEXT NOT NULL DEFAULT '',
    voucher_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, invoice_no),
    FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_ledger_id) REFERENCES ledgers(id),
    FOREIGN KEY(voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    rate_paise INTEGER NOT NULL DEFAULT 0,
    tax_rate_percent REAL NOT NULL DEFAULT 0,
    line_total_paise INTEGER NOT NULL DEFAULT 0,
    tax_amount_paise INTEGER NOT NULL DEFAULT 0,
    total_paise INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
);
"""

DEFAULT_GROUPS = [
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

