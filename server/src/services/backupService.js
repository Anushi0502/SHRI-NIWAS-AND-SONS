import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { writeAuditLog } from "../middleware/audit.js";

const MODEL_ORDER = [
  "auditLog",
  "stockMovement",
  "invoiceItem",
  "invoice",
  "voucherEntry",
  "voucher",
  "refreshToken",
  "setting",
  "item",
  "hsnSac",
  "gstRate",
  "gstSetting",
  "ledger",
  "unit",
  "stockGroup",
  "accountGroup",
  "financialYear",
  "company",
  "user",
];

const CREATE_ORDER = [
  "company",
  "financialYear",
  "accountGroup",
  "stockGroup",
  "unit",
  "hsnSac",
  "gstRate",
  "gstSetting",
  "user",
  "ledger",
  "item",
  "voucher",
  "voucherEntry",
  "invoice",
  "invoiceItem",
  "stockMovement",
  "refreshToken",
  "setting",
  "auditLog",
];

const SEQUENCE_TABLES = [
  "User",
  "RefreshToken",
  "Company",
  "FinancialYear",
  "AccountGroup",
  "StockGroup",
  "Unit",
  "HsnSac",
  "GstRate",
  "GstSetting",
  "Ledger",
  "Item",
  "Voucher",
  "VoucherEntry",
  "Invoice",
  "InvoiceItem",
  "StockMovement",
  "Setting",
  "AuditLog",
];

function modelFieldNames() {
  return {
    company: ["financialYearStart", "financialYearEnd", "createdAt", "updatedAt"],
    financialYear: ["startDate", "endDate", "createdAt", "updatedAt"],
    accountGroup: ["createdAt", "updatedAt"],
    stockGroup: ["createdAt", "updatedAt"],
    unit: ["createdAt", "updatedAt"],
    hsnSac: ["applicableFrom", "createdAt", "updatedAt"],
    gstRate: ["effectiveFrom", "effectiveTo", "createdAt", "updatedAt"],
    gstSetting: ["createdAt", "updatedAt"],
    user: ["lastLoginAt", "createdAt", "updatedAt"],
    ledger: ["createdAt", "updatedAt"],
    item: ["createdAt", "updatedAt"],
    voucher: ["voucherDate", "createdAt", "updatedAt"],
    voucherEntry: ["createdAt"],
    invoice: ["invoiceDate", "createdAt", "updatedAt"],
    invoiceItem: ["createdAt"],
    stockMovement: ["movementDate", "createdAt", "updatedAt"],
    refreshToken: ["expiresAt", "revokedAt", "createdAt"],
    setting: ["value", "createdAt", "updatedAt"],
    auditLog: ["before", "after", "metadata", "createdAt"],
  };
}

function hydrateDates(model, record) {
  const fields = modelFieldNames()[model] || [];
  const copy = { ...record };
  for (const field of fields) {
    if (copy[field]) {
      if (field === "value" || field === "before" || field === "after" || field === "metadata") {
        continue;
      }
      copy[field] = new Date(copy[field]);
    }
  }
  return copy;
}

async function collectSnapshot() {
  const snapshot = {};
  for (const model of MODEL_ORDER.slice().reverse()) {
    snapshot[model] = await prisma[model].findMany();
  }
  return snapshot;
}

export async function createBackup(backupDir, actor) {
  await fs.mkdir(backupDir, { recursive: true });
  const snapshot = await collectSnapshot();
  const fileName = `shreenivas-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(backupDir, fileName);
  await fs.writeFile(filePath, JSON.stringify({ generatedAt: new Date().toISOString(), snapshot }, null, 2), "utf8");

  await writeAuditLog({
    userId: actor?.id || null,
    companyId: actor?.activeCompanyId || null,
    action: "BACKUP_CREATE",
    entityType: "Backup",
    entityId: fileName,
    metadata: { filePath },
  });

  return { filePath, fileName };
}

export async function restoreBackup(filePath, actor, confirm = false) {
  if (!confirm) {
    throw new AppError("Restore confirmation is required", 400);
  }

  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const snapshot = parsed.snapshot;
  if (!snapshot) {
    throw new AppError("Invalid backup file", 400);
  }

  await prisma.$transaction(async (tx) => {
    for (const model of MODEL_ORDER) {
      await tx[model].deleteMany({});
    }

    for (const model of CREATE_ORDER) {
      const rows = (snapshot[model] || []).map((row) => hydrateDates(model, row));
      if (rows.length) {
        await tx[model].createMany({ data: rows });
      }
    }

    for (const tableName of SEQUENCE_TABLES) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 1), (SELECT COUNT(*) > 0 FROM "${tableName}"))`,
      );
    }
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId: actor?.activeCompanyId || null,
    action: "BACKUP_RESTORE",
    entityType: "Backup",
    entityId: path.basename(filePath),
    metadata: { filePath, confirm },
  });

  return { restored: true };
}
