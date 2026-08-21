import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BACKUP_DIR: z.string().default("./backups"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(25),
});

export const env = envSchema.parse(process.env);
