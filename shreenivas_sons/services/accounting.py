from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Iterable

from ..db import Database
from ..utils.money import money_to_paise
from .backup import backup_database as _backup_database
from .backup import restore_database as _restore_database
from .invoices import generate_invoice_pdf as _generate_invoice_pdf
from .invoices import save_invoice as _save_invoice


def _as_dicts(rows):
    return [dict(row) for row in rows]


def _to_paise(value) -> int:
    if isinstance(value, int):
        return value
    return money_to_paise(value)


def _parse_date(value) -> str:
    return str(value)


def validate_voucher_rows(rows: Iterable[dict]) -> None:
    rows = list(rows)
    if len(rows) < 2:
        raise ValueError("At least two ledger entries are required")

    debit_total = 0
    credit_total = 0
    for row in rows:
        debit = _to_paise(row.get("debit_paise", 0))
        credit = _to_paise(row.get("credit_paise", 0))
        if debit < 0 or credit < 0:
            raise ValueError("Voucher amounts must be positive")
        if debit > 0 and credit > 0:
            raise ValueError("Each voucher row can only have a debit or credit amount")
        if debit == 0 and credit == 0:
            raise ValueError("Voucher amounts must be positive")
        debit_total += debit
        credit_total += credit

    if debit_total <= 0 or credit_total <= 0:
        raise ValueError("Voucher totals must be positive")
    if debit_total != credit_total:
        raise ValueError("Voucher debit and credit totals do not match")


class AccountingService:
    def __init__(self, db_path: str | Path):
        self.db = Database(db_path)

    def initialize(self) -> None:
        self.db.initialize()

    def list_companies(self) -> list[dict]:
        return _as_dicts(self.db.fetchall("SELECT * FROM companies ORDER BY name"))

    def get_company(self, company_id: int) -> dict | None:
        row = self.db.fetchone("SELECT * FROM companies WHERE id = ?", (company_id,))
        return dict(row) if row else None

    def _get_setting(self, key: str) -> str:
        row = self.db.fetchone("SELECT setting_value FROM app_settings WHERE setting_key = ?", (key,))
        return row["setting_value"] if row else ""

    def _set_setting(self, key: str, value: str) -> None:
        with self.db.connect() as conn:
            conn.execute(
                """
                INSERT INTO app_settings(setting_key, setting_value)
                VALUES (?, ?)
                ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
                """,
                (key, value),
            )

    def active_company_id(self) -> int | None:
        value = self._get_setting("active_company_id")
        return int(value) if value else None

    def set_active_company(self, company_id: int) -> None:
        self._set_setting("active_company_id", str(company_id))

    def create_company(
        self,
        name: str,
        address: str,
        gst_number: str,
        phone: str,
        email: str,
        fy_start: str,
        fy_end: str,
    ) -> int:
        with self.db.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO companies(name, address, gst_number, phone, email, fy_start, fy_end)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (name, address, gst_number, phone, email, fy_start, fy_end),
            )
            company_id = cursor.lastrowid
        if self.active_company_id() is None:
            self.set_active_company(company_id)
        return company_id

    def update_company(
        self,
        company_id: int,
        name: str,
        address: str,
        gst_number: str,
        phone: str,
        email: str,
        fy_start: str,
        fy_end: str,
    ) -> None:
        with self.db.connect() as conn:
            conn.execute(
                """
                UPDATE companies
                SET name = ?, address = ?, gst_number = ?, phone = ?, email = ?,
                    fy_start = ?, fy_end = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (name, address, gst_number, phone, email, fy_start, fy_end, company_id),
            )

    def list_groups(self) -> list[dict]:
        return _as_dicts(self.db.fetchall("SELECT * FROM account_groups ORDER BY name"))

    def create_ledger(
        self,
        company_id: int,
        name: str,
        group_name: str,
        opening_balance_paise: int,
        opening_balance_type: str,
        address: str,
        phone: str,
        gst_number: str,
    ) -> int:
        with self.db.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO ledgers(
                    company_id, name, group_name, opening_balance_paise, opening_balance_type,
                    address, phone, gst_number
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    company_id,
                    name,
                    group_name,
                    int(opening_balance_paise),
                    opening_balance_type,
                    address,
                    phone,
                    gst_number,
                ),
            )
            return cursor.lastrowid

    def update_ledger(
        self,
        ledger_id: int,
        name: str,
        group_name: str,
        opening_balance_paise: int,
        opening_balance_type: str,
        address: str,
        phone: str,
        gst_number: str,
    ) -> None:
        with self.db.connect() as conn:
            conn.execute(
                """
                UPDATE ledgers
                SET name = ?, group_name = ?, opening_balance_paise = ?, opening_balance_type = ?,
                    address = ?, phone = ?, gst_number = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    name,
                    group_name,
                    int(opening_balance_paise),
                    opening_balance_type,
                    address,
                    phone,
                    gst_number,
                    ledger_id,
                ),
            )

    def delete_ledger(self, ledger_id: int) -> None:
        with self.db.connect() as conn:
            conn.execute("UPDATE ledgers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (ledger_id,))

    def list_ledgers(self, company_id: int, search: str = "") -> list[dict]:
        params: list[str | int] = [company_id]
        sql = "SELECT * FROM ledgers WHERE company_id = ? AND is_active = 1"
        if search.strip():
            sql += " AND name LIKE ?"
            params.append(f"%{search.strip()}%")
        sql += " ORDER BY name"
        return _as_dicts(self.db.fetchall(sql, params))

    def get_ledger(self, ledger_id: int) -> dict | None:
        row = self.db.fetchone("SELECT * FROM ledgers WHERE id = ?", (ledger_id,))
        return dict(row) if row else None

    def _groups_by_name(self) -> dict[str, dict]:
        return {group["name"]: group for group in self.list_groups()}

    def _first_ledger_id_in_group(self, company_id: int, group_name: str) -> int:
        row = self.db.fetchone(
            """
            SELECT id
            FROM ledgers
            WHERE company_id = ? AND group_name = ? AND is_active = 1
            ORDER BY id
            LIMIT 1
            """,
            (company_id, group_name),
        )
        if row is None:
            raise ValueError(f"No ledger found in group {group_name}")
        return int(row["id"])

    def save_voucher(
        self,
        company_id: int,
        voucher_type: str,
        voucher_no: str,
        voucher_date: str,
        narration: str,
        rows: Iterable[dict],
    ) -> int:
        rows = list(rows)
        validate_voucher_rows(rows)
        with self.db.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO vouchers(company_id, voucher_no, voucher_type, voucher_date, narration)
                VALUES (?, ?, ?, ?, ?)
                """,
                (company_id, voucher_no, voucher_type, voucher_date, narration),
            )
            voucher_id = cursor.lastrowid
            for sort_order, row in enumerate(rows):
                conn.execute(
                    """
                    INSERT INTO voucher_entries(
                        voucher_id, ledger_id, sort_order, debit_paise, credit_paise, narration
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        voucher_id,
                        row["ledger_id"],
                        sort_order,
                        int(row.get("debit_paise", 0)),
                        int(row.get("credit_paise", 0)),
                        row.get("narration", ""),
                    ),
            )
        return voucher_id

    def next_voucher_no(self, company_id: int, voucher_type: str, voucher_date: str) -> str:
        prefix_map = {
            "Payment": "PAY",
            "Receipt": "REC",
            "Sales": "SAL",
            "Purchase": "PUR",
            "Journal": "JV",
            "Contra": "CON",
        }
        prefix = prefix_map.get(voucher_type, voucher_type[:3].upper())
        row = self.db.fetchone(
            """
            SELECT COALESCE(MAX(CAST(SUBSTR(voucher_no, INSTR(voucher_no, '-') + 1) AS INTEGER)), 0) AS max_seq
            FROM vouchers
            WHERE company_id = ? AND voucher_type = ?
            """,
            (company_id, voucher_type),
        )
        next_seq = int(row["max_seq"]) + 1 if row else 1
        return f"{prefix}-{next_seq:04d}"

    def list_vouchers(self, company_id: int, start_date: str, end_date: str) -> list[dict]:
        return _as_dicts(
            self.db.fetchall(
                """
                SELECT * FROM vouchers
                WHERE company_id = ? AND voucher_date BETWEEN ? AND ?
                ORDER BY voucher_date, id
                """,
                (company_id, start_date, end_date),
            )
        )

    def voucher_details(self, voucher_id: int) -> dict | None:
        voucher = self.db.fetchone("SELECT * FROM vouchers WHERE id = ?", (voucher_id,))
        if voucher is None:
            return None
        rows = _as_dicts(
            self.db.fetchall(
                """
                SELECT ve.*, l.name AS ledger_name
                FROM voucher_entries ve
                JOIN ledgers l ON l.id = ve.ledger_id
                WHERE ve.voucher_id = ?
                ORDER BY ve.sort_order
                """,
                (voucher_id,),
            )
        )
        return {"voucher": dict(voucher), "rows": rows}

    def _ledger_opening_balance_signed(self, ledger: dict) -> int:
        amount = int(ledger["opening_balance_paise"])
        return amount if ledger["opening_balance_type"] == "Dr" else -amount

    def _ledger_balance_signed_before(self, ledger_id: int, start_date: str) -> int:
        ledger = self.get_ledger(ledger_id)
        if ledger is None:
            raise ValueError("Ledger not found")
        opening = self._ledger_opening_balance_signed(ledger)
        row = self.db.fetchone(
            """
            SELECT COALESCE(SUM(debit_paise), 0) AS debit_total,
                   COALESCE(SUM(credit_paise), 0) AS credit_total
            FROM voucher_entries ve
            JOIN vouchers v ON v.id = ve.voucher_id
            WHERE ve.ledger_id = ? AND v.voucher_date < ?
            """,
            (ledger_id, start_date),
        )
        return opening + int(row["debit_total"]) - int(row["credit_total"])

    def _ledger_balance_signed_range(self, ledger_id: int, start_date: str, end_date: str) -> int:
        row = self.db.fetchone(
            """
            SELECT COALESCE(SUM(debit_paise), 0) AS debit_total,
                   COALESCE(SUM(credit_paise), 0) AS credit_total
            FROM voucher_entries ve
            JOIN vouchers v ON v.id = ve.voucher_id
            WHERE ve.ledger_id = ? AND v.voucher_date BETWEEN ? AND ?
            """,
            (ledger_id, start_date, end_date),
        )
        return int(row["debit_total"]) - int(row["credit_total"])

    def _ledger_balance_signed_as_of(self, ledger_id: int, as_on: str) -> int:
        ledger = self.get_ledger(ledger_id)
        if ledger is None:
            raise ValueError("Ledger not found")
        opening = self._ledger_opening_balance_signed(ledger)
        row = self.db.fetchone(
            """
            SELECT COALESCE(SUM(debit_paise), 0) AS debit_total,
                   COALESCE(SUM(credit_paise), 0) AS credit_total
            FROM voucher_entries ve
            JOIN vouchers v ON v.id = ve.voucher_id
            WHERE ve.ledger_id = ? AND v.voucher_date <= ?
            """,
            (ledger_id, as_on),
        )
        return opening + int(row["debit_total"]) - int(row["credit_total"])

    def _category_ledger_movements(self, company_id: int, start_date: str, end_date: str) -> dict[str, int]:
        groups = self._groups_by_name()
        totals = {"asset": 0, "liability": 0, "capital": 0, "income": 0, "expense": 0}
        ledgers = self.list_ledgers(company_id)
        for ledger in ledgers:
            category = groups.get(ledger["group_name"], {}).get("report_category", "")
            if category not in totals:
                continue
            movement = self._ledger_balance_signed_range(ledger["id"], start_date, end_date)
            if category in {"asset", "expense"}:
                totals[category] += movement
            else:
                totals[category] += -movement
        return totals

    def _category_ledger_balances_as_of(self, company_id: int, as_on: str) -> dict[str, int]:
        groups = self._groups_by_name()
        totals = {"asset": 0, "liability": 0, "capital": 0, "income": 0, "expense": 0}
        ledgers = self.list_ledgers(company_id)
        for ledger in ledgers:
            category = groups.get(ledger["group_name"], {}).get("report_category", "")
            if category not in totals:
                continue
            balance = self._ledger_balance_signed_as_of(ledger["id"], as_on)
            if category in {"asset", "expense"}:
                totals[category] += balance
            else:
                totals[category] += -balance
        return totals

    def ledger_statement(self, company_id: int, ledger_id: int, start_date: str, end_date: str) -> dict:
        ledger = self.get_ledger(ledger_id)
        if ledger is None or ledger["company_id"] != company_id:
            raise ValueError("Ledger not found")

        opening_balance_paise = self._ledger_balance_signed_before(ledger_id, start_date)
        rows = []
        running_balance_paise = opening_balance_paise
        entries = self.db.fetchall(
            """
            SELECT v.voucher_date, v.voucher_no, v.voucher_type, v.narration,
                   ve.debit_paise, ve.credit_paise
            FROM voucher_entries ve
            JOIN vouchers v ON v.id = ve.voucher_id
            WHERE ve.ledger_id = ? AND v.voucher_date BETWEEN ? AND ?
            ORDER BY v.voucher_date, v.id, ve.sort_order
            """,
            (ledger_id, start_date, end_date),
        )
        for entry in entries:
            running_balance_paise += int(entry["debit_paise"]) - int(entry["credit_paise"])
            rows.append(
                {
                    "voucher_date": entry["voucher_date"],
                    "voucher_no": entry["voucher_no"],
                    "voucher_type": entry["voucher_type"],
                    "narration": entry["narration"],
                    "debit_paise": int(entry["debit_paise"]),
                    "credit_paise": int(entry["credit_paise"]),
                    "running_balance_paise": running_balance_paise,
                }
            )
        return {
            "ledger": ledger,
            "opening_balance_paise": opening_balance_paise,
            "rows": rows,
            "closing_balance_paise": running_balance_paise,
        }

    def trial_balance(self, company_id: int, as_on: str) -> dict:
        ledgers = self.list_ledgers(company_id)
        rows = []
        totals = {"debit_paise": 0, "credit_paise": 0}
        for ledger in ledgers:
            balance_paise = self._ledger_balance_signed_as_of(ledger["id"], as_on)
            debit_paise = balance_paise if balance_paise > 0 else 0
            credit_paise = -balance_paise if balance_paise < 0 else 0
            totals["debit_paise"] += debit_paise
            totals["credit_paise"] += credit_paise
            rows.append(
                {
                    "ledger_name": ledger["name"],
                    "group_name": ledger["group_name"],
                    "debit_paise": debit_paise,
                    "credit_paise": credit_paise,
                    "balance_paise": balance_paise,
                }
            )
        rows.sort(key=lambda row: row["ledger_name"])
        return {"rows": rows, "totals": totals}

    def profit_and_loss(self, company_id: int, start_date: str, end_date: str) -> dict:
        movements = self._category_ledger_movements(company_id, start_date, end_date)
        income_paise = movements["income"]
        expense_paise = movements["expense"]
        net_profit_paise = income_paise - expense_paise
        return {
            "income_paise": income_paise,
            "expense_paise": expense_paise,
            "net_profit_paise": net_profit_paise,
            "movements": movements,
        }

    def balance_sheet(self, company_id: int, as_on: str) -> dict:
        balances = self._category_ledger_balances_as_of(company_id, as_on)
        net_profit_paise = self.profit_and_loss(company_id, self.get_company(company_id)["fy_start"], as_on)[
            "net_profit_paise"
        ]
        assets_paise = balances["asset"]
        liabilities_plus_capital_paise = balances["liability"] + balances["capital"] + net_profit_paise
        return {
            "balances": balances,
            "totals": {
                "assets_paise": assets_paise,
                "liabilities_plus_capital_paise": liabilities_plus_capital_paise,
            },
            "net_profit_paise": net_profit_paise,
        }

    def day_book(self, company_id: int, start_date: str, end_date: str, voucher_type: str = "") -> dict:
        vouchers = self.list_vouchers(company_id, start_date, end_date)
        rows = []
        for voucher in vouchers:
            if voucher_type and voucher["voucher_type"] != voucher_type:
                continue
            totals = self.db.fetchone(
                """
                SELECT COALESCE(SUM(debit_paise), 0) AS debit_total,
                       COALESCE(SUM(credit_paise), 0) AS credit_total
                FROM voucher_entries
                WHERE voucher_id = ?
                """,
                (voucher["id"],),
            )
            rows.append(
                {
                    "voucher_id": voucher["id"],
                    "voucher_date": voucher["voucher_date"],
                    "voucher_no": voucher["voucher_no"],
                    "voucher_type": voucher["voucher_type"],
                    "narration": voucher["narration"],
                    "debit_paise": int(totals["debit_total"]),
                    "credit_paise": int(totals["credit_total"]),
                }
            )
        return {"rows": rows}

    def dashboard_summary(self, company_id: int) -> dict:
        company = self.get_company(company_id)
        if company is None:
            raise ValueError("Company not found")
        as_on = company["fy_end"]
        groups = self._groups_by_name()
        cash = 0
        bank = 0
        receivables = 0
        payables = 0
        for ledger in self.list_ledgers(company_id):
            balance = self._ledger_balance_signed_as_of(ledger["id"], as_on)
            group_name = ledger["group_name"]
            category = groups.get(group_name, {}).get("report_category", "")
            if group_name == "Cash-in-Hand":
                cash += max(balance, 0)
            elif group_name == "Bank Accounts":
                bank += max(balance, 0)
            elif group_name == "Sundry Debtors":
                receivables += max(balance, 0)
            elif group_name == "Sundry Creditors":
                payables += max(-balance, 0)
            elif category == "asset" and balance > 0:
                receivables += 0
        return {
            "company": company,
            "cash_paise": cash,
            "bank_paise": bank,
            "receivables_paise": receivables,
            "payables_paise": payables,
            "financial_year": f"{company['fy_start']} to {company['fy_end']}",
        }

    def save_invoice(
        self,
        company_id: int,
        invoice_no: str,
        invoice_date: str,
        customer_ledger_id: int,
        items: list[dict],
        narration: str = "",
    ) -> int:
        return _save_invoice(
            self,
            company_id=company_id,
            invoice_no=invoice_no,
            invoice_date=invoice_date,
            customer_ledger_id=customer_ledger_id,
            items=items,
            narration=narration,
        )

    def generate_invoice_pdf(self, invoice_id: int, path) -> None:
        _generate_invoice_pdf(self, invoice_id, path)

    def backup_database(self, backup_path) -> None:
        _backup_database(self.db.path, backup_path)

    def restore_database(self, backup_path) -> None:
        _restore_database(backup_path, self.db.path)
