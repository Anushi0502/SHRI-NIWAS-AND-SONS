import { z } from "zod";

export const stockGroupSchema = z.object({
  name: z.string().min(2),
  parentName: z.string().optional().nullable(),
});

export const unitSchema = z.object({
  name: z.string().min(2),
  symbol: z.string().min(1),
  decimalPlaces: z.coerce.number().int().nonnegative().default(2),
});

export const hsnSacSchema = z.object({
  code: z.string().min(2),
  description: z.string().min(2),
  itemType: z.string().min(2),
  gstRate: z.coerce.number().nonnegative().default(0),
  cessRate: z.coerce.number().nonnegative().default(0),
  applicableFrom: z.string().min(1),
});

export const itemSchema = z.object({
  stockGroupId: z.coerce.number().int().positive().optional().nullable(),
  unitId: z.coerce.number().int().positive().optional().nullable(),
  hsnSacId: z.coerce.number().int().positive().optional().nullable(),
  name: z.string().min(2),
  sku: z.string().min(2),
  barcode: z.string().optional().default(""),
  openingStockQty: z.coerce.number().nonnegative().default(0),
  openingStockValuePaisa: z.coerce.number().int().nonnegative().default(0),
  lowStockLevelQty: z.coerce.number().nonnegative().default(0),
  purchaseRatePaisa: z.coerce.number().int().nonnegative().default(0),
  salesRatePaisa: z.coerce.number().int().nonnegative().default(0),
  isGoods: z.boolean().optional(),
});

export const stockMovementSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  movementType: z.enum(["OPENING", "PURCHASE_INWARD", "SALES_OUTWARD", "ADJUSTMENT"]),
  movementDate: z.string().min(1),
  quantity: z.coerce.number(),
  ratePaisa: z.coerce.number().int().nonnegative().default(0),
  amountPaisa: z.coerce.number().int(),
  notes: z.string().optional().default(""),
});

export const inventoryQuerySchema = z.object({
  search: z.string().optional().default(""),
  itemId: z.coerce.number().int().positive().optional(),
  movementType: z.enum(["OPENING", "PURCHASE_INWARD", "SALES_OUTWARD", "ADJUSTMENT"]).optional(),
});
