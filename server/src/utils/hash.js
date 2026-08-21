import crypto from "node:crypto";
import bcrypt from "bcrypt";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
