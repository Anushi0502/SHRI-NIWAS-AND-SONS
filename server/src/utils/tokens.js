import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

export function createAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m` });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export function signRefreshTokenPayload(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` });
}
