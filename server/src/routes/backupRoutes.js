import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { createBackupController, listBackupsController, restoreBackupController } from "../controllers/backupController.js";
import { restoreBackupSchema } from "../validators/backupValidators.js";

export const backupRoutes = Router();

backupRoutes.use(authenticate, requireRole("ADMIN"));
backupRoutes.get("/", listBackupsController);
backupRoutes.post("/create", createBackupController);
backupRoutes.post("/restore", validate(restoreBackupSchema), restoreBackupController);
