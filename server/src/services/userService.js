import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { hashPassword } from "../utils/hash.js";
import { writeAuditLog } from "../middleware/audit.js";

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { activeCompany: true },
  });
  return users.map(sanitizeUser);
}

export async function createUser(data, actor) {
  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      isActive: data.isActive ?? true,
    },
    include: { activeCompany: true },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId: actor?.activeCompanyId || null,
    action: "CREATE",
    entityType: "User",
    entityId: created.id,
    after: sanitizeUser(created),
  });

  return sanitizeUser(created);
}

export async function updateUser(userId, data, actor) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new AppError("User not found", 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name ?? existing.name,
      email: data.email ?? existing.email,
      role: data.role ?? existing.role,
      isActive: data.isActive ?? existing.isActive,
      ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}),
    },
    include: { activeCompany: true },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId: actor?.activeCompanyId || null,
    action: "UPDATE",
    entityType: "User",
    entityId: userId,
    before: sanitizeUser(existing),
    after: sanitizeUser(updated),
  });

  return sanitizeUser(updated);
}

export async function deleteUser(userId, actor) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new AppError("User not found", 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId: actor?.activeCompanyId || null,
    action: "DELETE",
    entityType: "User",
    entityId: userId,
    before: sanitizeUser(existing),
    after: sanitizeUser(updated),
  });

  return sanitizeUser(updated);
}
