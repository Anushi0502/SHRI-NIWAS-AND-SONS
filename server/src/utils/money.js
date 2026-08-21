import { Prisma } from "@prisma/client";

export function toPaise(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  const amount = typeof value === "string" ? Number(value) : Number(value);
  if (Number.isNaN(amount)) {
    throw new Error(`Invalid money value: ${value}`);
  }
  return Math.round(amount * 100);
}

export function fromPaise(value) {
  return (Number(value || 0) / 100).toFixed(2);
}

export function toDecimal(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(fallback);
  return new Prisma.Decimal(value);
}

export function roundToPaise(value) {
  return Math.round(Number(value));
}

export function toPercent(value) {
  if (value === null || value === undefined || value === "") return 0;
  return Number(value);
}
