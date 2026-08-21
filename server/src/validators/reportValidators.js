import { z } from "zod";

export const reportParamsSchema = z.object({
  reportName: z.string().min(1),
});

export const reportExportParamsSchema = z.object({
  reportName: z.string().min(1),
  format: z.enum(["pdf", "excel"]),
});

export const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  asOn: z.string().optional(),
  ledgerId: z.coerce.number().int().positive().optional(),
});
