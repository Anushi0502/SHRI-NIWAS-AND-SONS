import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { accountGroupSchema } from "../validators/accountGroupValidators.js";
import {
  createAccountGroupController,
  deleteAccountGroupController,
  listAccountGroupsController,
  updateAccountGroupController,
} from "../controllers/accountGroupController.js";
import { resolveCompany } from "../middleware/companyContext.js";

export const accountGroupRoutes = Router();

accountGroupRoutes.use(authenticate, resolveCompany);
accountGroupRoutes.get("/", listAccountGroupsController);
accountGroupRoutes.post("/", requireRole("ADMIN", "ACCOUNTANT"), validate(accountGroupSchema), createAccountGroupController);
accountGroupRoutes.put("/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(accountGroupSchema), updateAccountGroupController);
accountGroupRoutes.delete("/:id", requireRole("ADMIN", "ACCOUNTANT"), deleteAccountGroupController);
