import dayjs from "dayjs";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";
import { createAccessToken, createRefreshToken, sha256 } from "../utils/tokens.js";
import { verifyPassword } from "../utils/hash.js";
import { writeAuditLog } from "../middleware/audit.js";

const REFRESH_COOKIE_NAME = "shreenivas_refresh_token";

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function refreshExpiresAt() {
  return dayjs().add(env.REFRESH_TOKEN_TTL_DAYS, "day").toDate();
}

function buildSessionTokens(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    activeCompanyId: user.activeCompanyId || null,
  };

  const accessToken = createAccessToken(payload);
  const rawRefreshToken = createRefreshToken();
  return {
    accessToken,
    rawRefreshToken,
    refreshTokenHash: sha256(rawRefreshToken),
    refreshExpiresAt: refreshExpiresAt(),
  };
}

async function createRefreshTokenRecord({ userId, rawRefreshToken, req }) {
  const tokenHash = sha256(rawRefreshToken);
  const expiresAt = refreshExpiresAt();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      createdByIp: req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || null,
    },
  });

  return { tokenHash, expiresAt };
}

async function revokeRefreshToken(rawToken, replacementHash = null) {
  if (!rawToken) return null;
  const tokenHash = sha256(rawToken);
  const token = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!token) return null;

  if (!token.revokedAt) {
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: replacementHash,
      },
    });
  }

  return token;
}

export async function login({ email, password, req }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { activeCompany: true },
  });

  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password", 401);
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw new AppError("Invalid email or password", 401);
  }

  const { accessToken, rawRefreshToken, refreshTokenHash, refreshExpiresAt: expiresAt } = buildSessionTokens(user);
  await createRefreshTokenRecord({ userId: user.id, rawRefreshToken, req });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAuditLog({
    userId: user.id,
    companyId: user.activeCompanyId || null,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    metadata: { tokenHash: refreshTokenHash, expiresAt },
    ipAddress: req?.ip || null,
    userAgent: req?.headers?.["user-agent"] || null,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken: rawRefreshToken,
    refreshExpiresAt: expiresAt,
  };
}

export async function refreshSession({ rawRefreshToken, req }) {
  if (!rawRefreshToken) {
    throw new AppError("Refresh token required", 401);
  }

  const tokenHash = sha256(rawRefreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { activeCompany: true } } },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date() || !storedToken.user.isActive) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const nextRawRefreshToken = createRefreshToken();
  const nextTokenHash = sha256(nextRawRefreshToken);
  const expiresAt = refreshExpiresAt();

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { tokenHash },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: nextTokenHash,
      },
    });

    await tx.refreshToken.create({
      data: {
        userId: storedToken.userId,
        tokenHash: nextTokenHash,
        expiresAt,
        createdByIp: req?.ip || null,
        userAgent: req?.headers?.["user-agent"] || null,
      },
    });
  });

  const user = storedToken.user;
  const accessToken = createAccessToken({
    sub: user.id,
    role: user.role,
    activeCompanyId: user.activeCompanyId || null,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken: nextRawRefreshToken,
    refreshExpiresAt: expiresAt,
  };
}

export async function logout({ rawRefreshToken, req }) {
  const token = await revokeRefreshToken(rawRefreshToken);
  if (token) {
    await writeAuditLog({
      userId: token.userId,
      action: "LOGOUT",
      entityType: "RefreshToken",
      entityId: token.id,
      metadata: { revoked: true },
      ipAddress: req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || null,
    });
  }
}

export async function getSessionUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { activeCompany: true },
  });
  return sanitizeUser(user);
}

export async function setActiveCompany(userId, companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || !company.isActive) {
    throw new AppError("Company not found", 404);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { activeCompanyId: companyId },
    include: { activeCompany: true },
  });

  await writeAuditLog({
    userId,
    companyId,
    action: "SET_ACTIVE_COMPANY",
    entityType: "Company",
    entityId: companyId,
    metadata: { companyName: company.name },
  });

  return sanitizeUser(user);
}

export const authConstants = {
  REFRESH_COOKIE_NAME,
};
