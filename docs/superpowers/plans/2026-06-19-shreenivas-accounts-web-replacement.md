# Shreenivas Accounts Web Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the desktop accounting app with a secure full-stack web accounting system named `Shreenivas Accounts` built with React, Vite, Tailwind CSS, Node.js, Express.js, Prisma, PostgreSQL, JWT auth, Zod validation, PDF/Excel export, and accounting-grade reporting.

**Architecture:** Use a monorepo with a protected React SPA in `client/` and an Express + Prisma API in `server/`. The backend owns security, validation, accounting transactions, invoice posting, stock movement, GST logic, reporting, and backup/restore; the frontend owns authenticated navigation, company switching, data entry, dashboards, charts, and exports.

**Tech Stack:** React, Vite, Tailwind CSS, Axios, React Router, Recharts, React Hook Form, Zod, Node.js, Express.js, Prisma, PostgreSQL, JWT, bcrypt, helmet, cors, express-rate-limit, pdfkit, exceljs.

---

### Task 1: Monorepo Scaffold and Root Configuration

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Modify: `.gitignore`
- Create: `README.md`
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/index.html`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`
- Create: `server/package.json`
- Create: `server/src/app.js`
- Create: `server/src/server.js`
- Create: `server/src/config/env.js`
- Create: `server/src/config/prisma.js`
- Create: `server/prisma/schema.prisma`
- Create: `server/prisma/seed.js`

- [ ] **Step 1: Define workspace scripts and package dependencies**

Create a root `package.json` with workspace scripts for `dev`, `build`, and `seed`. Add client and server package manifests with the runtime dependencies required for routing, auth, validation, database access, charts, PDF, and spreadsheet export.

- [ ] **Step 2: Add environment documentation**

Create `.env.example` with `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_ORIGIN`, `API_PORT`, `NODE_ENV`, `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`, and `BACKUP_DIR`.

- [ ] **Step 3: Build the minimal app entrypoints**

Create `server/src/app.js` and `server/src/server.js` to bootstrap Express, mount routes, and start listening. Create `client/src/main.jsx` and `client/src/App.jsx` so Vite can mount the SPA.

- [ ] **Step 4: Add Prisma schema and seed entrypoint**

Create `server/prisma/schema.prisma` with all required models and `server/prisma/seed.js` to seed the admin user, accountant user, viewer user, default groups, GST ledgers, and demo company.

- [ ] **Step 5: Verify the scaffold**

Run:

```bash
npm install
npm run build
```

Expected: both packages resolve and the app shells compile.

- [ ] **Step 6: Commit**

```bash
git add package.json .env.example .gitignore README.md client server
git commit -m "feat: scaffold shreenivas accounts web app"
```

### Task 2: Backend Security, Auth, and Core Domain Infrastructure

**Files:**
- Create: `server/src/middleware/auth.js`
- Create: `server/src/middleware/roles.js`
- Create: `server/src/middleware/validate.js`
- Create: `server/src/middleware/error.js`
- Create: `server/src/middleware/audit.js`
- Create: `server/src/utils/appError.js`
- Create: `server/src/utils/tokens.js`
- Create: `server/src/utils/hash.js`
- Create: `server/src/utils/companyContext.js`
- Create: `server/src/services/authService.js`
- Create: `server/src/controllers/authController.js`
- Create: `server/src/routes/authRoutes.js`
- Create: `server/src/services/userService.js`
- Create: `server/src/controllers/userController.js`
- Create: `server/src/routes/userRoutes.js`
- Create: `server/src/validators/authValidators.js`
- Create: `server/src/validators/userValidators.js`

- [ ] **Step 1: Write auth and token tests**

Add server tests for login, refresh rotation, logout revocation, role checks, and company-scoped route blocking.

- [ ] **Step 2: Implement auth services**

Add bcrypt password verification, access token creation, refresh token hashing, token rotation, and logout revocation.

- [ ] **Step 3: Add middleware**

Add JWT authentication, role guards, Zod validation, request-scoped company resolution, centralized error handling, and audit capture hooks.

- [ ] **Step 4: Add user administration**

Implement admin-only user CRUD for the seeded roles `Admin`, `Accountant`, and `Viewer`.

- [ ] **Step 5: Verify auth flows**

Run the server tests and confirm login returns an access token, refresh uses the httpOnly cookie, and unauthorized requests are rejected.

- [ ] **Step 6: Commit**

```bash
git add server/src
git commit -m "feat: add auth, roles, and security middleware"
```

### Task 3: Company, GST, Ledger, and Financial Year APIs

**Files:**
- Create: `server/src/services/companyService.js`
- Create: `server/src/services/gstService.js`
- Create: `server/src/services/ledgerService.js`
- Create: `server/src/controllers/companyController.js`
- Create: `server/src/controllers/gstController.js`
- Create: `server/src/controllers/ledgerController.js`
- Create: `server/src/routes/companyRoutes.js`
- Create: `server/src/routes/gstRoutes.js`
- Create: `server/src/routes/ledgerRoutes.js`
- Create: `server/src/validators/companyValidators.js`
- Create: `server/src/validators/gstValidators.js`
- Create: `server/src/validators/ledgerValidators.js`

- [ ] **Step 1: Write company and ledger tests**

Add tests for create/edit/delete company, active company switching, default group creation, GST ledger seeding, and ledger search/opening balance persistence.

- [ ] **Step 2: Implement company lifecycle**

Create company records with financial year fields, currency, and address/legal details. Seed default groups and GST ledgers for each company inside a Prisma transaction.

- [ ] **Step 3: Implement GST settings**

Store enable/disable state, GSTIN, registration type, company state, invoice prefix, numbering, and place of supply logic per company.

- [ ] **Step 4: Implement ledger management**

Support party details, GSTIN, PAN, state, address, phone, email, credit limit, opening balance Dr/Cr, search, edit, delete, and company scoping.

- [ ] **Step 5: Verify domain operations**

Run the company and ledger tests and confirm data is isolated by company and default masters are seeded correctly.

- [ ] **Step 6: Commit**

```bash
git add server/src
git commit -m "feat: add company and ledger domain APIs"
```

### Task 4: Voucher, Invoice, Inventory, and Accounting Posting Logic

**Files:**
- Create: `server/src/services/voucherService.js`
- Create: `server/src/services/invoiceService.js`
- Create: `server/src/services/inventoryService.js`
- Create: `server/src/controllers/voucherController.js`
- Create: `server/src/controllers/invoiceController.js`
- Create: `server/src/controllers/inventoryController.js`
- Create: `server/src/routes/voucherRoutes.js`
- Create: `server/src/routes/invoiceRoutes.js`
- Create: `server/src/routes/inventoryRoutes.js`
- Create: `server/src/validators/voucherValidators.js`
- Create: `server/src/validators/invoiceValidators.js`
- Create: `server/src/validators/inventoryValidators.js`

- [ ] **Step 1: Write voucher and invoice tests**

Add tests for balanced vouchers, minimum two rows, positive amounts, invoice posting, stock movements, same-state GST split, different-state IGST, and delete/update audit logging.

- [ ] **Step 2: Implement voucher transactions**

Validate each voucher with Zod, save headers and entries in a transaction, and block unbalanced or negative rows.

- [ ] **Step 3: Implement sales and purchase invoices**

Generate invoice rows, save the invoice, create the accounting voucher, post GST lines, and create stock movements for inward/outward quantities.

- [ ] **Step 4: Implement inventory masters**

Add stock groups, units, items, SKU/barcode, HSN/SAC mapping, opening stock, stock adjustment, and low-stock summary helpers.

- [ ] **Step 5: Verify posting rules**

Run voucher and invoice tests and confirm every accounting transaction uses a database transaction and leaves audit logs.

- [ ] **Step 6: Commit**

```bash
git add server/src
git commit -m "feat: add vouchers, invoices, and inventory posting"
```

### Task 5: Reports, Exports, Dashboard, and Backup/Restore

**Files:**
- Create: `server/src/services/reportService.js`
- Create: `server/src/services/exportService.js`
- Create: `server/src/services/backupService.js`
- Create: `server/src/controllers/reportController.js`
- Create: `server/src/controllers/dashboardController.js`
- Create: `server/src/controllers/exportController.js`
- Create: `server/src/controllers/backupController.js`
- Create: `server/src/routes/reportRoutes.js`
- Create: `server/src/routes/dashboardRoutes.js`
- Create: `server/src/routes/exportRoutes.js`
- Create: `server/src/routes/backupRoutes.js`
- Create: `server/src/reports/reportBuilders.js`

- [ ] **Step 1: Write report and export tests**

Add tests for day book, ledger report, trial balance, profit and loss, balance sheet, sales/purchase registers, receivables/payables, GST summaries, PDF export, Excel export, backup creation, and restore confirmation.

- [ ] **Step 2: Implement accounting reports**

Build report helpers that aggregate from voucher entries, opening balances, invoice data, and stock movements.

- [ ] **Step 3: Implement PDF and Excel export**

Generate downloadable report files and printable invoice PDFs with the company name, invoice rows, totals, and tax summary.

- [ ] **Step 4: Implement backup and restore**

Create admin-only snapshot export/import flows with a required confirmation flag before restore and audit log entries for both actions.

- [ ] **Step 5: Verify dashboard and reporting**

Run the report tests and verify dashboard totals and charts use live API data rather than hard-coded values.

- [ ] **Step 6: Commit**

```bash
git add server/src
git commit -m "feat: add reports, exports, and backup tools"
```

### Task 6: React Frontend Shell and Feature Pages

**Files:**
- Create: `client/src/api/http.js`
- Create: `client/src/api/auth.js`
- Create: `client/src/api/resources.js`
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/context/CompanyContext.jsx`
- Create: `client/src/routes/ProtectedRoute.jsx`
- Create: `client/src/layouts/AppLayout.jsx`
- Create: `client/src/components/Sidebar.jsx`
- Create: `client/src/components/Topbar.jsx`
- Create: `client/src/components/DataTable.jsx`
- Create: `client/src/components/FormField.jsx`
- Create: `client/src/components/StatCard.jsx`
- Create: `client/src/components/ChartPanel.jsx`
- Create: `client/src/pages/LoginPage.jsx`
- Create: `client/src/pages/DashboardPage.jsx`
- Create: `client/src/pages/CompaniesPage.jsx`
- Create: `client/src/pages/LedgersPage.jsx`
- Create: `client/src/pages/VouchersPage.jsx`
- Create: `client/src/pages/InvoicesPage.jsx`
- Create: `client/src/pages/InventoryPage.jsx`
- Create: `client/src/pages/GstPage.jsx`
- Create: `client/src/pages/ReportsPage.jsx`
- Create: `client/src/pages/UsersPage.jsx`
- Create: `client/src/pages/BackupPage.jsx`
- Create: `client/src/pages/SettingsPage.jsx`
- Create: `client/src/styles/index.css`

- [ ] **Step 1: Write frontend rendering tests or smoke checks**

Add lightweight import/build checks so the SPA routes, layout, and shared components load without syntax errors.

- [ ] **Step 2: Implement auth and route protection**

Build login, token refresh, protected routes, role-aware navigation, and active company context persistence.

- [ ] **Step 3: Implement shared UI primitives**

Add the sidebar, top bar, cards, tables, forms, dialogs, toasts, loading states, and responsive layout.

- [ ] **Step 4: Implement feature pages**

Build the CRUD pages for companies, ledgers, vouchers, invoices, inventory, GST settings, reports, users, backup, and settings using the API layer.

- [ ] **Step 5: Add dashboard visuals**

Render revenue, purchase, balance, receivable, payable, GST, and stock summaries plus monthly charts with Recharts.

- [ ] **Step 6: Commit**

```bash
git add client/src
git commit -m "feat: build react accounting frontend"
```

### Task 7: Verification, Cleanup, and Documentation

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`
- Create: `server/tests/*`
- Create: `client/src/*` smoke checks as needed

- [ ] **Step 1: Run complete backend and frontend verification**

Build the client, run Prisma migrations/seed, and exercise the API with the frontend against a live database.

- [ ] **Step 2: Fix any integration defects**

Resolve mismatched field names, validation gaps, route guards, report math issues, and export problems.

- [ ] **Step 3: Finalize documentation**

Update the README with setup, environment variables, migration, seed, run, export, backup, and security notes.

- [ ] **Step 4: Final commit**

```bash
git add README.md .gitignore server client
git commit -m "feat: complete shreenivas accounts web replacement"
```

## Review Checklist

- Authentication uses bcrypt, JWT access tokens, and refresh token rotation.
- Every write path uses validation and a database transaction where needed.
- Reports are computed from voucher entries and accounting masters.
- Inventory and GST posting logic are tied to invoices and stock movements.
- The UI is original and not a Tally clone.
- Backup and restore are admin-only and auditable.
