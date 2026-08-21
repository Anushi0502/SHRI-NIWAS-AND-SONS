import { z } from "zod";

export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]),
  isActive: z.boolean().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["ADMIN", "ACCOUNTANT", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
});
