import { z } from "zod";

export const accountGroupSchema = z.object({
  name: z.string().min(2),
  parentName: z.string().optional().nullable(),
  reportCategory: z.string().min(2),
});
