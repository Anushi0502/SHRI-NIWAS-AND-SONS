import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { validateVoucherRows, nextVoucherNumber } from "../utils/accounting.js";
import { toDate } from "../utils/dates.js";
import { writeAuditLog } from "../middleware/audit.js";

function mapVoucher(voucher) {
  return voucher;
}

export async function listVouchers(companyId, filters = {}) {
  const where = {
    companyId,
    isDeleted: false,
    ...(filters.voucherType ? { voucherType: filters.voucherType } : {}),
    ...(filters.startDate && filters.endDate
      ? { voucherDate: { gte: toDate(filters.startDate), lte: toDate(filters.endDate) } }
      : {}),
  };

  return prisma.voucher.findMany({
    where,
    include: {
      entries: {
        include: { ledger: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ voucherDate: "desc" }, { id: "desc" }],
  });
}

export async function getVoucher(companyId, voucherId) {
  const voucher = await prisma.voucher.findFirst({
    where: { id: voucherId, companyId, isDeleted: false },
    include: {
      entries: {
        include: { ledger: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!voucher) throw new AppError("Voucher not found", 404);
  return voucher;
}

async function createVoucherInternal(tx, companyId, data, actor) {
  const rows = data.entries.map((row) => ({
    ledgerId: row.ledgerId,
    debitPaisa: Number(row.debitPaisa || 0),
    creditPaisa: Number(row.creditPaisa || 0),
    narration: row.narration || "",
  }));
  const totals = validateVoucherRows(rows);
  const ledgerIds = [...new Set(rows.map((row) => row.ledgerId))];
  const ledgers = await tx.ledger.findMany({
    where: {
      companyId,
      id: { in: ledgerIds },
      isActive: true,
    },
  });
  if (ledgers.length !== ledgerIds.length) {
    throw new AppError("One or more voucher ledgers were not found", 404);
  }
  const voucherNo = data.voucherNo || (await nextVoucherNumber(tx, companyId, data.voucherType));

  const voucher = await tx.voucher.create({
    data: {
      companyId,
      voucherNo,
      voucherType: data.voucherType,
      voucherDate: toDate(data.voucherDate),
      narration: data.narration || "",
      referenceNo: data.referenceNo || null,
      sourceType: data.sourceType || null,
      sourceId: data.sourceId || null,
      totalDebitPaisa: totals.totalDebit,
      totalCreditPaisa: totals.totalCredit,
      createdById: actor?.id || null,
      updatedById: actor?.id || null,
      entries: {
        create: rows.map((row, index) => ({
          ledgerId: row.ledgerId,
          sortOrder: index,
          debitPaisa: row.debitPaisa,
          creditPaisa: row.creditPaisa,
          narration: row.narration,
        })),
      },
    },
    include: {
      entries: {
        include: { ledger: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return voucher;
}

export async function createVoucher(companyId, data, actor) {
  const voucher = await prisma.$transaction(async (tx) => createVoucherInternal(tx, companyId, data, actor));
  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "CREATE",
    entityType: "Voucher",
    entityId: voucher.id,
    after: voucher,
  });
  return mapVoucher(voucher);
}

export async function updateVoucher(companyId, voucherId, data, actor) {
  const existing = await getVoucher(companyId, voucherId);
  const resolvedEntries = data.entries
    ? data.entries
    : existing.entries.map((entry) => ({
        ledgerId: entry.ledgerId,
        debitPaisa: entry.debitPaisa,
        creditPaisa: entry.creditPaisa,
        narration: entry.narration,
      }));
  const rows = resolvedEntries.map((row) => ({
    ledgerId: row.ledgerId,
    debitPaisa: Number(row.debitPaisa || 0),
    creditPaisa: Number(row.creditPaisa || 0),
    narration: row.narration || "",
  }));
  const totals = validateVoucherRows(rows);

  const finalVoucher = await prisma.$transaction(async (tx) => {
    await tx.voucherEntry.deleteMany({ where: { voucherId } });
    await tx.voucher.update({
      where: { id: voucherId },
      data: {
        voucherNo: data.voucherNo ?? existing.voucherNo,
        voucherType: data.voucherType ?? existing.voucherType,
        voucherDate: data.voucherDate ? toDate(data.voucherDate) : existing.voucherDate,
        narration: data.narration ?? existing.narration,
        referenceNo: data.referenceNo === undefined ? existing.referenceNo : data.referenceNo,
        sourceType: data.sourceType === undefined ? existing.sourceType : data.sourceType,
        sourceId: data.sourceId === undefined ? existing.sourceId : data.sourceId,
        totalDebitPaisa: totals.totalDebit,
        totalCreditPaisa: totals.totalCredit,
        updatedById: actor?.id || null,
      },
    });

    await tx.voucherEntry.createMany({
      data: rows.map((row, index) => ({
        voucherId,
        ledgerId: row.ledgerId,
        sortOrder: index,
        debitPaisa: row.debitPaisa,
        creditPaisa: row.creditPaisa,
        narration: row.narration,
      })),
    });

    return tx.voucher.findUnique({
      where: { id: voucherId },
      include: {
        entries: {
          include: { ledger: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "UPDATE",
    entityType: "Voucher",
    entityId: voucherId,
    before: existing,
    after: finalVoucher,
  });
  return finalVoucher;
}

export async function deleteVoucher(companyId, voucherId, actor) {
  const existing = await getVoucher(companyId, voucherId);
  const voucher = await prisma.voucher.update({
    where: { id: voucherId },
    data: { isDeleted: true },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "Voucher",
    entityId: voucherId,
    before: existing,
    after: voucher,
  });

  return voucher;
}

export { createVoucherInternal };
