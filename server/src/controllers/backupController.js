import path from "node:path";
import fs from "node:fs/promises";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createBackup, restoreBackup } from "../services/backupService.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

export const listBackupsController = asyncHandler(async (req, res) => {
  const backupDir = path.resolve(env.BACKUP_DIR);
  await fs.mkdir(backupDir, { recursive: true });
  const files = await fs.readdir(backupDir);
  const backups = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const stat = await fs.stat(path.join(backupDir, file));
        return {
          fileName: file,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime,
        };
      }),
  );
  res.json({ backups });
});

export const createBackupController = asyncHandler(async (req, res) => {
  const backup = await createBackup(path.resolve(env.BACKUP_DIR), req.user);
  res.status(201).json({ backup });
});

export const restoreBackupController = asyncHandler(async (req, res) => {
  const backupDir = path.resolve(env.BACKUP_DIR);
  const filePath = path.resolve(backupDir, req.validated.fileName);
  const relative = path.relative(backupDir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new AppError("Invalid backup path", 400);
  }
  const result = await restoreBackup(filePath, req.user, req.validated.confirm);
  res.json(result);
});
