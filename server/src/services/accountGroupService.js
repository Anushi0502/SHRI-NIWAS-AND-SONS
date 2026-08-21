import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { writeAuditLog } from "../middleware/audit.js";

export async function listAccountGroups(companyId) {
  return prisma.accountGroup.findMany({
    where: { companyId },
    orderBy: [{ reportCategory: "asc" }, { name: "asc" }],
  });
}

export async function createAccountGroup(companyId, data, actor) {
  const group = await prisma.accountGroup.create({
    data: {
      companyId,
      name: data.name,
      parentName: data.parentName ?? null,
      reportCategory: data.reportCategory,
      isSystem: false,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "CREATE",
    entityType: "AccountGroup",
    entityId: group.id,
    after: group,
  });

  return group;
}

export async function updateAccountGroup(companyId, groupId, data, actor) {
  const existing = await prisma.accountGroup.findFirst({ where: { id: groupId, companyId } });
  if (!existing) throw new AppError("Account group not found", 404);
  if (existing.isSystem) throw new AppError("System groups cannot be edited", 400);

  const group = await prisma.accountGroup.update({
    where: { id: groupId },
    data: {
      name: data.name ?? existing.name,
      parentName: data.parentName ?? existing.parentName,
      reportCategory: data.reportCategory ?? existing.reportCategory,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "UPDATE",
    entityType: "AccountGroup",
    entityId: groupId,
    before: existing,
    after: group,
  });

  return group;
}

export async function deleteAccountGroup(companyId, groupId, actor) {
  const existing = await prisma.accountGroup.findFirst({
    where: { id: groupId, companyId },
    include: { ledgers: true },
  });
  if (!existing) throw new AppError("Account group not found", 404);
  if (existing.isSystem) throw new AppError("System groups cannot be deleted", 400);
  if (existing.ledgers.length) throw new AppError("Group has ledgers and cannot be deleted", 400);

  await prisma.accountGroup.delete({ where: { id: groupId } });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "AccountGroup",
    entityId: groupId,
    before: existing,
  });
}
