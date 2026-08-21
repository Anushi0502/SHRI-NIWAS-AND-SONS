import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { resolveCompany } from "../middleware/companyContext.js";
import { validate } from "../middleware/validate.js";
import { reportExportParamsSchema, reportParamsSchema, reportQuerySchema } from "../validators/reportValidators.js";
import { exportReportController, getReportController } from "../controllers/reportController.js";

export const reportRoutes = Router();

reportRoutes.use(authenticate, resolveCompany);
reportRoutes.get(
  "/:reportName",
  validate(reportParamsSchema, "params"),
  validate(reportQuerySchema, "query"),
  getReportController,
);
reportRoutes.get(
  "/:reportName/export/:format",
  validate(reportExportParamsSchema, "params"),
  validate(reportQuerySchema, "query"),
  exportReportController,
);
