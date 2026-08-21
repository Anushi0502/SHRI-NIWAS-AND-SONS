import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { toDate, currentFinancialYear } from "../utils/dates.js";
import { writeAuditLog } from "../middleware/audit.js";
import { seedDefaultMasters } from "./masterData.js";
import { RegistrationType } from "@prisma/client";

function normalizeCompanyInput(data, fallback = {}) {
  const fyStart = data.financialYearStart
    ? toDate(data.financialYearStart)
    : fallback.financialYearStart
      ? new Date(fallback.financialYearStart)
      : currentFinancialYear().startDate;
  const fyEnd = data.financialYearEnd
    ? toDate(data.financialYearEnd)
    : fallback.financialYearEnd
      ? new Date(fallback.financialYearEnd)
      : currentFinancialYear().endDate;
  return {
    name: data.name,
    address: data.address ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    gstin: data.gstin ?? "",
    pan: data.pan ?? "",
    state: data.state ?? "",
    financialYearStart: fyStart,
    financialYearEnd: fyEnd,
    currency: data.currency ?? "INR",
  };
}

export async function listCompanies() {
  return prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      gstSetting: true,
      financialYears: true,
    },
  });
}

export async function getCompany(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      gstSetting: true,
      financialYears: true,
    },
  });
  if (!company) throw new AppError("Company not found", 404);
  return company;
}

export async function createCompany(data, actor) {
  const payload = normalizeCompanyInput(data);
  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: payload,
    });

    await tx.financialYear.create({
      data: {
        companyId: company.id,
        label: `${payload.financialYearStart.toISOString().slice(0, 10)} to ${payload.financialYearEnd.toISOString().slice(0, 10)}`,
        startDate: payload.financialYearStart,
        endDate: payload.financialYearEnd,
        isCurrent: true,
      },
    });

    await tx.gstSetting.create({
      data: {
        companyId: company.id,
        enabled: true,
        gstin: payload.gstin,
        registrationType: RegistrationType.REGULAR,
        companyState: payload.state,
        invoicePrefix: "INV",
        nextInvoiceNumber: 1,
        placeOfSupplyLogic: "STATE_BASED",
      },
    });

    await seedDefaultMasters(tx, company, { companyState: payload.state });
    return company;
  });

  if (actor?.id) {
    await prisma.user.update({
      where: { id: actor.id },
      data: { activeCompanyId: result.id },
    });
  }

  await writeAuditLog({
    userId: actor?.id || null,
    companyId: result.id,
    action: "CREATE",
    entityType: "Company",
    entityId: result.id,
    after: result,
  });

  return getCompany(result.id);
}

export async function updateCompany(companyId, data, actor) {
  const existing = await getCompany(companyId);
  const payload = normalizeCompanyInput({ ...existing, ...data }, existing);
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: payload,
  });

  if (data.gstin || data.state) {
    await prisma.gstSetting.upsert({
      where: { companyId },
      update: {
        gstin: payload.gstin,
        companyState: payload.state,
      },
      create: {
        companyId,
        enabled: true,
        gstin: payload.gstin,
        registrationType: RegistrationType.REGULAR,
        companyState: payload.state,
        invoicePrefix: "INV",
        nextInvoiceNumber: 1,
        placeOfSupplyLogic: "STATE_BASED",
      },
    });
  }

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "UPDATE",
    entityType: "Company",
    entityId: companyId,
    before: existing,
    after: updated,
  });

  return getCompany(companyId);
}

export async function deleteCompany(companyId, actor) {
  const existing = await getCompany(companyId);
  await prisma.company.update({
    where: { id: companyId },
    data: { isActive: false },
  });

  if (actor?.id && actor.activeCompanyId === companyId) {
    const fallback = await prisma.company.findFirst({
      where: { isActive: true, id: { not: companyId } },
      orderBy: { name: "asc" },
    });
    await prisma.user.update({
      where: { id: actor.id },
      data: { activeCompanyId: fallback?.id || null },
    });
  }

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "Company",
    entityId: companyId,
    before: existing,
    after: { isActive: false },
  });
}

export async function activateCompany(userId, companyId) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, isActive: true },
  });
  if (!company) throw new AppError("Company not found", 404);

  await prisma.user.update({
    where: { id: userId },
    data: { activeCompanyId: companyId },
  });

  return company;
}
