import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { companyActivateSchema, companyCreateSchema, companyUpdateSchema } from "../validators/companyValidators.js";
import {
  activateCompanyController,
  createCompanyController,
  deleteCompanyController,
  listCompaniesController,
  updateCompanyController,
} from "../controllers/companyController.js";

export const companyRoutes = Router();

companyRoutes.use(authenticate);
companyRoutes.get("/", listCompaniesController);
companyRoutes.post("/", requireRole("ADMIN", "ACCOUNTANT"), validate(companyCreateSchema), createCompanyController);
companyRoutes.put("/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(companyUpdateSchema), updateCompanyController);
companyRoutes.delete("/:id", requireRole("ADMIN"), deleteCompanyController);
companyRoutes.post("/activate", validate(companyActivateSchema), activateCompanyController);
