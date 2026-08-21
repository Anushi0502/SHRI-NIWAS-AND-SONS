# Shreenivas Accounts Web App Design

> Original full-stack accounting application for Shreenivas & Sons, built as a secure React + Express + Prisma web app with PostgreSQL persistence, double-entry accounting, GST handling, inventory, reporting, exports, and admin operations.

**Goal:** Replace the existing desktop app with a complete original web accounting system named `Shreenivas Accounts` that supports multi-company bookkeeping, role-based access, GST workflows, inventory, reports, exports, and admin backup/restore.

**Architecture:** Use a monorepo with a React/Vite/Tailwind client and an Express/Prisma/PostgreSQL API server. The backend owns validation, security, business rules, transactions, and report calculations; the frontend is a thin authenticated SPA that renders modules, submits forms, and displays reports and dashboards.

**Tech Stack:** React, Vite, Tailwind CSS, Axios, React Router, Recharts, React Hook Form, Zod, Node.js, Express.js, Prisma, PostgreSQL, JWT, bcrypt, helmet, CORS, rate limiting, PDFKit, exceljs.

---

## Product Shape

The UI will not imitate Tally branding or layout. It will use a modern business dashboard:

- A compact dark sidebar with grouped navigation
- A light content area with strong cards, tables, and forms
- A top bar for company switching, role badge, and quick actions
- Report views with filters, summaries, and export buttons

The application is company-scoped. A user selects an active company, and all ledgers, vouchers, invoices, inventory, and reports are evaluated inside that company context.

## Core Architecture

### Backend

The API will be organized by domain:

- Authentication and token rotation
- Company and financial year management
- Account groups and ledgers
- GST settings and tax helpers
- Inventory, HSN/SAC, and stock movements
- Voucher posting and double-entry validation
- Sales and purchase invoices
- Reports and dashboard aggregates
- PDF and Excel exports
- Backup and restore
- User administration

All write paths use Prisma transactions. Reports are derived from voucher entries, stock movements, invoice data, and master records rather than from stored report totals.

### Frontend

The client will be a protected SPA with:

- Login and session restore
- Sidebar navigation with role-aware visibility
- Shared tables, search, filters, and forms
- Dashboard cards and charts
- CRUD pages for all major modules
- Download and print actions for reports and invoices

Client state will keep only the access token in memory and rely on the refresh token cookie for session restoration.

## Data Model

Prisma models will cover:

- User
- RefreshToken
- Company
- FinancialYear
- AccountGroup
- Ledger
- Voucher
- VoucherEntry
- Invoice
- InvoiceItem
- Item
- StockGroup
- Unit
- StockMovement
- HsnSac
- GstRate
- GstSetting
- AuditLog
- Setting

The company record stores legal identity details and current financial year fields. GST settings are company-specific. Account groups, ledgers, items, vouchers, invoices, and stock belong to a single company.

## Accounting Rules

- Every voucher must be balanced.
- Voucher entries must have at least two rows.
- A row cannot contain both debit and credit amounts.
- Positive values only.
- Reports are computed from voucher entries and opening balances.
- Sales invoices create customer debit, sales credit, GST output credit, and stock outward movements.
- Purchase invoices create purchase debit, GST input debit, supplier credit, and stock inward movements.
- Same-state GST uses CGST + SGST.
- Different-state GST uses IGST.

## GST Rules

GST behavior is controlled by company GST settings and the supply party state:

- Regular, composition, and unregistered registration types are supported
- GST can be enabled or disabled per company
- Invoice numbering supports prefixes and incrementing sequences
- Place of supply is determined from company state and party state
- GST reports are summarized from invoice and tax data

## Security Rules

- bcrypt password hashing
- JWT access token plus rotated refresh token cookie
- Protected routes for authenticated users
- Role checks for admin, accountant, and viewer
- Helmet, rate limiting, and secure CORS
- Zod validation on all input boundaries
- Centralized error handling
- Audit logging for create/update/delete/login/logout/restore events

## Exports and Ops

- PDF export for invoices and reports
- Excel export for reports
- Print preview for invoice documents
- Admin-only backup and restore
- Safety confirmation before restore

## Open Assumptions

- Users can work across multiple companies, but one active company is selected at a time.
- The first user seeded is an admin account for setup and recovery.
- Backup and restore are implemented as guarded application snapshots rather than raw database superuser commands.
