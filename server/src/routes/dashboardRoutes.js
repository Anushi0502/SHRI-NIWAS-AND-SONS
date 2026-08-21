import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { resolveCompany } from "../middleware/companyContext.js";
import { dashboardController } from "../controllers/dashboardController.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate, resolveCompany);
dashboardRoutes.get("/", dashboardController);
