import { asyncHandler } from "../utils/asyncHandler.js";
import { createInvoice, deleteInvoice, generateInvoicePdf, getInvoice, listInvoices, updateInvoice } from "../services/invoiceService.js";
import path from "node:path";
import fs from "node:fs/promises";
import { env } from "../config/env.js";

export const listInvoicesController = asyncHandler(async (req, res) => {
  const invoices = await listInvoices(req.companyId, req.validated || {});
  res.json({ invoices });
});

export const getInvoiceController = asyncHandler(async (req, res) => {
  const invoice = await getInvoice(req.companyId, Number(req.params.id));
  res.json({ invoice });
});

export const createInvoiceController = asyncHandler(async (req, res) => {
  const invoice = await createInvoice(req.companyId, req.validated, req.user);
  res.status(201).json({ invoice });
});

export const updateInvoiceController = asyncHandler(async (req, res) => {
  const invoice = await updateInvoice(req.companyId, Number(req.params.id), req.validated, req.user);
  res.json({ invoice });
});

export const deleteInvoiceController = asyncHandler(async (req, res) => {
  await deleteInvoice(req.companyId, Number(req.params.id), req.user);
  res.json({ ok: true });
});

export const invoicePdfController = asyncHandler(async (req, res) => {
  const fileName = `invoice-${req.params.id}.pdf`;
  const outputDir = path.resolve(env.BACKUP_DIR, "invoices");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, fileName);
  await generateInvoicePdf(req.companyId, Number(req.params.id), outputPath);
  res.download(outputPath, fileName);
});
