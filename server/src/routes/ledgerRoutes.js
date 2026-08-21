import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { resolveCompany } from "../middleware/companyContext.js";
import { ledgerSchema } from "../validators/ledgerValidators.js";
import {
  createLedgerController,
  deleteLedgerController,
  getLedgerController,
  listLedgersController,
  updateLedgerController,
} from "../controllers/ledgerController.js";
import { z } from "zod";

export const ledgerRoutes = Router();

ledgerRoutes.use(authenticate, resolveCompany);
ledgerRoutes.get("/", validate(z.object({ search: z.string().optional().default("") }), "query"), listLedgersController);
ledgerRoutes.get("/:id", getLedgerController);
ledgerRoutes.post("/", requireRole("ADMIN", "ACCOUNTANT"), validate(ledgerSchema), createLedgerController);
ledgerRoutes.put("/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(ledgerSchema.partial()), updateLedgerController);
ledgerRoutes.delete("/:id", requireRole("ADMIN", "ACCOUNTANT"), deleteLedgerController);
