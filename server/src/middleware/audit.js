import { prisma } from "../config/prisma.js";

export async function writeAuditLog({
  userId = null,
  companyId = null,
  action,
  entityType,
  entityId = null,
  before = null,
  after = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      companyId,
      action,
      entityType,
      entityId: entityId === null || entityId === undefined ? null : String(entityId),
      before,
      after,
      metadata,
      ipAddress,
      userAgent,
    },
  });
}
