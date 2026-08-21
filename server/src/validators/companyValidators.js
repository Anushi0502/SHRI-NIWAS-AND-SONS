import { z } from "zod";

const dateString = z.string().min(1);

export const companyCreateSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  gstin: z.string().optional().default(""),
  pan: z.string().optional().default(""),
  state: z.string().min(2),
  financialYearStart: dateString.optional(),
  financialYearEnd: dateString.optional(),
  currency: z.string().min(1).default("INR"),
});

export const companyUpdateSchema = companyCreateSchema.partial();

export const companyActivateSchema = z.object({
  companyId: z.coerce.number().int().positive(),
});
