import { AppError } from "../utils/appError.js";
import { prisma } from "../config/prisma.js";

export async function resolveCompany(req, res, next) {
  const headerValue = req.headers["x-company-id"];
  const companyId = headerValue ? Number(headerValue) : req.user?.activeCompanyId || null;

  if (!companyId) {
    return next(new AppError("Active company is required", 400));
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return next(new AppError("Company not found", 404));
  }

  req.company = company;
  req.companyId = company.id;
  return next();
}
