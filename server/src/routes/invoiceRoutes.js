import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { resolveCompany } from "../middleware/companyContext.js";
import { invoiceQuerySchema, invoiceSchema, invoiceUpdateSchema } from "../validators/invoiceValidators.js";
import {
  createInvoiceController,
  deleteInvoiceController,
  getInvoiceController,
  invoicePdfController,
  listInvoicesController,
  updateInvoiceController,
} from "../controllers/invoiceController.js";

export const invoiceRoutes = Router();

invoiceRoutes.use(authenticate, resolveCompany);
invoiceRoutes.get("/", validate(invoiceQuerySchema, "query"), listInvoicesController);
invoiceRoutes.get("/:id", getInvoiceController);
invoiceRoutes.get("/:id/pdf", invoicePdfController);
invoiceRoutes.post("/", requireRole("ADMIN", "ACCOUNTANT"), validate(invoiceSchema), createInvoiceController);
invoiceRoutes.put("/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(invoiceUpdateSchema), updateInvoiceController);
invoiceRoutes.delete("/:id", requireRole("ADMIN", "ACCOUNTANT"), deleteInvoiceController);
