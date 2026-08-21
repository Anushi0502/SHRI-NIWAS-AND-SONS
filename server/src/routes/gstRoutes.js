import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { gstSettingSchema } from "../validators/gstValidators.js";
import { getGstSettingController, updateGstSettingController } from "../controllers/gstController.js";
import { resolveCompany } from "../middleware/companyContext.js";

export const gstRoutes = Router();

gstRoutes.use(authenticate, resolveCompany);
gstRoutes.get("/setting", getGstSettingController);
gstRoutes.put("/setting", requireRole("ADMIN", "ACCOUNTANT"), validate(gstSettingSchema), updateGstSettingController);
