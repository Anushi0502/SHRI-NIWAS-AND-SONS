import { z } from "zod";

export const restoreBackupSchema = z.object({
  fileName: z.string().min(1),
  confirm: z.boolean(),
});
