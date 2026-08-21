import { z } from "zod";

const invoiceItemSchema = z.object({
  itemId: z.coerce.number().int().positive().optional().nullable(),
  itemName: z.string().optional(),
  hsnSacCode: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unitPricePaisa: z.coerce.number().int().nonnegative().optional(),
  discountPercent: z.coerce.number().nonnegative().optional(),
  discountPaisa: z.coerce.number().int().nonnegative().optional(),
  gstRate: z.coerce.number().nonnegative().optional(),
  cessRate: z.coerce.number().nonnegative().optional(),
});

export const invoiceSchema = z.object({
  invoiceNo: z.string().optional().nullable(),
  invoiceDate: z.string().min(1),
  invoiceType: z.enum(["SALES", "PURCHASE", "SALES_RETURN", "PURCHASE_RETURN"]),
  gstInvoiceType: z.string().optional().default("TAX_INVOICE"),
  partyLedgerId: z.coerce.number().int().positive(),
  placeOfSupply: z.string().optional().default(""),
  isReverseCharge: z.boolean().optional(),
  notes: z.string().optional().default(""),
  items: z.array(invoiceItemSchema).min(1),
});

export const invoiceUpdateSchema = invoiceSchema.partial().extend({
  items: z.array(invoiceItemSchema).min(1).optional(),
});

export const invoiceQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  invoiceType: z.string().optional(),
});
