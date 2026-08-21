import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { writeAuditLog } from "../middleware/audit.js";

export async function listLedgers(companyId, search = "") {
  const query = search.trim();
  return prisma.ledger.findMany({
    where: {
      companyId,
      isActive: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { gstin: { contains: query, mode: "insensitive" } },
              { pan: { contains: query, mode: "insensitive" } },
              { state: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { accountGroup: true },
    orderBy: { name: "asc" },
  });
}

export async function getLedger(companyId, ledgerId) {
  const ledger = await prisma.ledger.findFirst({
    where: { id: ledgerId, companyId },
    include: { accountGroup: true },
  });
  if (!ledger) throw new AppError("Ledger not found", 404);
  return ledger;
}

export async function createLedger(companyId, data, actor) {
  const accountGroup = await prisma.accountGroup.findFirst({
    where: { id: data.accountGroupId, companyId },
  });
  if (!accountGroup) {
    throw new AppError("Account group not found", 404);
  }

  const ledger = await prisma.ledger.create({
    data: {
      companyId,
      accountGroupId: data.accountGroupId,
      name: data.name,
      openingBalancePaisa: data.openingBalancePaisa ?? 0,
      openingBalanceType: data.openingBalanceType ?? "Dr",
      ledgerType: data.ledgerType ?? "NORMAL",
      gstin: data.gstin ?? "",
      pan: data.pan ?? "",
      state: data.state ?? "",
      address: data.address ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      creditLimitPaisa: data.creditLimitPaisa ?? 0,
      isParty: data.isParty ?? false,
    },
    include: { accountGroup: true },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "CREATE",
    entityType: "Ledger",
    entityId: ledger.id,
    after: ledger,
  });

  return ledger;
}

export async function updateLedger(companyId, ledgerId, data, actor) {
  const existing = await getLedger(companyId, ledgerId);
  if (data.accountGroupId) {
    const accountGroup = await prisma.accountGroup.findFirst({
      where: { id: data.accountGroupId, companyId },
    });
    if (!accountGroup) {
      throw new AppError("Account group not found", 404);
    }
  }
  const ledger = await prisma.ledger.update({
    where: { id: ledgerId },
    data: {
      accountGroupId: data.accountGroupId ?? existing.accountGroupId,
      name: data.name ?? existing.name,
      openingBalancePaisa: data.openingBalancePaisa ?? existing.openingBalancePaisa,
      openingBalanceType: data.openingBalanceType ?? existing.openingBalanceType,
      ledgerType: data.ledgerType ?? existing.ledgerType,
      gstin: data.gstin ?? existing.gstin,
      pan: data.pan ?? existing.pan,
      state: data.state ?? existing.state,
      address: data.address ?? existing.address,
      phone: data.phone ?? existing.phone,
      email: data.email ?? existing.email,
      creditLimitPaisa: data.creditLimitPaisa ?? existing.creditLimitPaisa,
      isParty: data.isParty ?? existing.isParty,
    },
    include: { accountGroup: true },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "UPDATE",
    entityType: "Ledger",
    entityId: ledgerId,
    before: existing,
    after: ledger,
  });

  return ledger;
}

export async function deleteLedger(companyId, ledgerId, actor) {
  const existing = await getLedger(companyId, ledgerId);
  const ledger = await prisma.ledger.update({
    where: { id: ledgerId },
    data: { isActive: false },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "Ledger",
    entityId: ledgerId,
    before: existing,
    after: ledger,
  });

  return ledger;
}
