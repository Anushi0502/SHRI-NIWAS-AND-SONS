import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { resolveCompany } from "../middleware/companyContext.js";
import { voucherQuerySchema, voucherSchema, voucherUpdateSchema } from "../validators/voucherValidators.js";
import {
  createVoucherController,
  deleteVoucherController,
  getVoucherController,
  listVouchersController,
  updateVoucherController,
} from "../controllers/voucherController.js";

export const voucherRoutes = Router();

voucherRoutes.use(authenticate, resolveCompany);
voucherRoutes.get("/", validate(voucherQuerySchema, "query"), listVouchersController);
voucherRoutes.get("/:id", getVoucherController);
voucherRoutes.post("/", requireRole("ADMIN", "ACCOUNTANT"), validate(voucherSchema), createVoucherController);
voucherRoutes.put("/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(voucherUpdateSchema), updateVoucherController);
voucherRoutes.delete("/:id", requireRole("ADMIN", "ACCOUNTANT"), deleteVoucherController);
