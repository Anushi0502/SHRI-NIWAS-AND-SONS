import { z } from "zod";

export const ledgerSchema = z.object({
  accountGroupId: z.coerce.number().int().positive(),
  name: z.string().min(2),
  openingBalancePaisa: z.coerce.number().int().optional(),
  openingBalanceType: z.enum(["Dr", "Cr"]).optional(),
  ledgerType: z.string().optional(),
  gstin: z.string().optional().default(""),
  pan: z.string().optional().default(""),
  state: z.string().optional().default(""),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  creditLimitPaisa: z.coerce.number().int().optional(),
  isParty: z.boolean().optional(),
});
