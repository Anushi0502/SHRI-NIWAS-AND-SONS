import { asyncHandler } from "../utils/asyncHandler.js";
import { activateCompany, createCompany, deleteCompany, listCompanies, updateCompany } from "../services/companyService.js";

export const listCompaniesController = asyncHandler(async (req, res) => {
  const companies = await listCompanies();
  res.json({ companies });
});

export const createCompanyController = asyncHandler(async (req, res) => {
  const company = await createCompany(req.validated, req.user);
  res.status(201).json({ company });
});

export const updateCompanyController = asyncHandler(async (req, res) => {
  const company = await updateCompany(Number(req.params.id), req.validated, req.user);
  res.json({ company });
});

export const deleteCompanyController = asyncHandler(async (req, res) => {
  await deleteCompany(Number(req.params.id), req.user);
  res.json({ ok: true });
});

export const activateCompanyController = asyncHandler(async (req, res) => {
  const company = await activateCompany(req.user.id, req.validated.companyId);
  res.json({ company });
});
