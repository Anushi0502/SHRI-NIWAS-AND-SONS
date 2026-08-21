import { z } from "zod";

export const gstSettingSchema = z.object({
  enabled: z.boolean().optional(),
  gstin: z.string().optional().default(""),
  registrationType: z.enum(["REGULAR", "COMPOSITION", "UNREGISTERED"]).optional(),
  companyState: z.string().min(2).optional(),
  invoicePrefix: z.string().min(1).optional(),
  nextInvoiceNumber: z.coerce.number().int().positive().optional(),
  placeOfSupplyLogic: z.string().optional(),
  reverseChargeEnabled: z.boolean().optional(),
});
