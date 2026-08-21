import { z } from "zod";

const voucherEntrySchema = z.object({
  ledgerId: z.coerce.number().int().positive(),
  debitPaisa: z.coerce.number().int().nonnegative().default(0),
  creditPaisa: z.coerce.number().int().nonnegative().default(0),
  narration: z.string().optional().default(""),
});

export const voucherSchema = z.object({
  voucherNo: z.string().optional(),
  voucherType: z.enum([
    "PAYMENT",
    "RECEIPT",
    "CONTRA",
    "JOURNAL",
    "SALES",
    "PURCHASE",
    "DEBIT_NOTE",
    "CREDIT_NOTE",
    "SALES_RETURN",
    "PURCHASE_RETURN",
  ]),
  voucherDate: z.string().min(1),
  narration: z.string().optional().default(""),
  referenceNo: z.string().optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceId: z.coerce.number().int().positive().optional().nullable(),
  entries: z.array(voucherEntrySchema).min(2),
});

export const voucherUpdateSchema = voucherSchema.partial().extend({
  entries: z.array(voucherEntrySchema).min(2).optional(),
});

export const voucherQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  voucherType: z.string().optional(),
});
