import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { writeAuditLog } from "../middleware/audit.js";
import { toDecimal } from "../utils/money.js";

function currentFromMovement(item) {
  const latest = item.stockMovements?.[0];
  if (latest) {
    return {
      currentQty: Number(latest.runningQty),
      currentValuePaisa: latest.runningValuePaisa,
    };
  }

  return {
    currentQty: Number(item.openingStockQty || 0),
    currentValuePaisa: item.openingStockValuePaisa || 0,
  };
}

export async function listStockGroups(companyId) {
  return prisma.stockGroup.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function createStockGroup(companyId, data, actor) {
  const group = await prisma.stockGroup.create({
    data: {
      companyId,
      name: data.name,
      parentName: data.parentName ?? null,
      isSystem: false,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "CREATE",
    entityType: "StockGroup",
    entityId: group.id,
    after: group,
  });

  return group;
}

export async function updateStockGroup(companyId, groupId, data, actor) {
  const existing = await prisma.stockGroup.findFirst({ where: { id: groupId, companyId } });
  if (!existing) throw new AppError("Stock group not found", 404);
  if (existing.isSystem) throw new AppError("System stock groups cannot be edited", 400);

  const group = await prisma.stockGroup.update({
    where: { id: groupId },
    data: {
      name: data.name ?? existing.name,
      parentName: data.parentName ?? existing.parentName,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "UPDATE",
    entityType: "StockGroup",
    entityId: groupId,
    before: existing,
    after: group,
  });

  return group;
}

export async function deleteStockGroup(companyId, groupId, actor) {
  const existing = await prisma.stockGroup.findFirst({
    where: { id: groupId, companyId },
    include: { items: true },
  });
  if (!existing) throw new AppError("Stock group not found", 404);
  if (existing.isSystem) throw new AppError("System stock groups cannot be deleted", 400);
  if (existing.items.length) throw new AppError("Stock group contains items and cannot be deleted", 400);

  await prisma.stockGroup.delete({ where: { id: groupId } });
  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "StockGroup",
    entityId: groupId,
    before: existing,
  });
}

export async function listUnits(companyId) {
  return prisma.unit.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function createUnit(companyId, data, actor) {
  const unit = await prisma.unit.create({
    data: {
      companyId,
      name: data.name,
      symbol: data.symbol,
      decimalPlaces: data.decimalPlaces ?? 2,
      isSystem: false,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "CREATE",
    entityType: "Unit",
    entityId: unit.id,
    after: unit,
  });

  return unit;
}

export async function updateUnit(companyId, unitId, data, actor) {
  const existing = await prisma.unit.findFirst({ where: { id: unitId, companyId } });
  if (!existing) throw new AppError("Unit not found", 404);
  if (existing.isSystem) throw new AppError("System units cannot be edited", 400);

  const unit = await prisma.unit.update({
    where: { id: unitId },
    data: {
      name: data.name ?? existing.name,
      symbol: data.symbol ?? existing.symbol,
      decimalPlaces: data.decimalPlaces ?? existing.decimalPlaces,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "UPDATE",
    entityType: "Unit",
    entityId: unitId,
    before: existing,
    after: unit,
  });

  return unit;
}

export async function deleteUnit(companyId, unitId, actor) {
  const existing = await prisma.unit.findFirst({
    where: { id: unitId, companyId },
    include: { items: true },
  });
  if (!existing) throw new AppError("Unit not found", 404);
  if (existing.isSystem) throw new AppError("System units cannot be deleted", 400);
  if (existing.items.length) throw new AppError("Unit is in use and cannot be deleted", 400);

  await prisma.unit.delete({ where: { id: unitId } });
  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "Unit",
    entityId: unitId,
    before: existing,
  });
}

export async function listHsnSac(companyId, search = "") {
  const query = search.trim();
  return prisma.hsnSac.findMany({
    where: {
      companyId,
      ...(query
        ? {
            OR: [
              { code: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ code: "asc" }],
  });
}

export async function createHsnSac(companyId, data, actor) {
  const hsn = await prisma.hsnSac.create({
    data: {
      companyId,
      code: data.code,
      description: data.description,
      itemType: data.itemType,
      gstRate: toDecimal(data.gstRate ?? 0),
      cessRate: toDecimal(data.cessRate ?? 0),
      applicableFrom: new Date(data.applicableFrom),
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "CREATE",
    entityType: "HsnSac",
    entityId: hsn.id,
    after: hsn,
  });

  return hsn;
}

export async function updateHsnSac(companyId, hsnId, data, actor) {
  const existing = await prisma.hsnSac.findFirst({ where: { id: hsnId, companyId } });
  if (!existing) throw new AppError("HSN/SAC not found", 404);

  const hsn = await prisma.hsnSac.update({
    where: { id: hsnId },
    data: {
      code: data.code ?? existing.code,
      description: data.description ?? existing.description,
      itemType: data.itemType ?? existing.itemType,
      gstRate: data.gstRate !== undefined ? toDecimal(data.gstRate) : existing.gstRate,
      cessRate: data.cessRate !== undefined ? toDecimal(data.cessRate) : existing.cessRate,
      applicableFrom: data.applicableFrom ? new Date(data.applicableFrom) : existing.applicableFrom,
      isActive: data.isActive ?? existing.isActive,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "UPDATE",
    entityType: "HsnSac",
    entityId: hsnId,
    before: existing,
    after: hsn,
  });

  return hsn;
}

export async function deleteHsnSac(companyId, hsnId, actor) {
  const existing = await prisma.hsnSac.findFirst({
    where: { id: hsnId, companyId },
    include: { items: true },
  });
  if (!existing) throw new AppError("HSN/SAC not found", 404);
  if (existing.items.length) throw new AppError("HSN/SAC is in use and cannot be deleted", 400);

  await prisma.hsnSac.delete({ where: { id: hsnId } });
  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "HsnSac",
    entityId: hsnId,
    before: existing,
  });
}

export async function listItems(companyId, search = "") {
  const query = search.trim();
  const items = await prisma.item.findMany({
    where: {
      companyId,
      isActive: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { barcode: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      stockGroup: true,
      unit: true,
      hsnSac: true,
      stockMovements: { where: { isDeleted: false }, orderBy: [{ movementDate: "desc" }, { id: "desc" }], take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return items.map((item) => ({
    ...item,
    ...currentFromMovement(item),
  }));
}

export async function getItem(companyId, itemId) {
  const item = await prisma.item.findFirst({
    where: { id: itemId, companyId },
    include: {
      stockGroup: true,
      unit: true,
      hsnSac: true,
      stockMovements: { where: { isDeleted: false }, orderBy: [{ movementDate: "desc" }, { id: "desc" }], take: 1 },
    },
  });
  if (!item) throw new AppError("Item not found", 404);
  return {
    ...item,
    ...currentFromMovement(item),
  };
}

export async function createItem(companyId, data, actor) {
  if (data.stockGroupId) {
    const stockGroup = await prisma.stockGroup.findFirst({ where: { id: data.stockGroupId, companyId } });
    if (!stockGroup) throw new AppError("Stock group not found", 404);
  }
  if (data.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: data.unitId, companyId } });
    if (!unit) throw new AppError("Unit not found", 404);
  }
  if (data.hsnSacId) {
    const hsnSac = await prisma.hsnSac.findFirst({ where: { id: data.hsnSacId, companyId } });
    if (!hsnSac) throw new AppError("HSN/SAC not found", 404);
  }

  const item = await prisma.item.create({
    data: {
      companyId,
      stockGroupId: data.stockGroupId ?? null,
      unitId: data.unitId ?? null,
      hsnSacId: data.hsnSacId ?? null,
      name: data.name,
      sku: data.sku,
      barcode: data.barcode ?? "",
      openingStockQty: toDecimal(data.openingStockQty ?? 0),
      openingStockValuePaisa: data.openingStockValuePaisa ?? 0,
      lowStockLevelQty: toDecimal(data.lowStockLevelQty ?? 0),
      purchaseRatePaisa: data.purchaseRatePaisa ?? 0,
      salesRatePaisa: data.salesRatePaisa ?? 0,
      isGoods: data.isGoods ?? true,
    },
    include: {
      stockGroup: true,
      unit: true,
      hsnSac: true,
      stockMovements: { where: { isDeleted: false }, take: 1, orderBy: { movementDate: "desc" } },
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "CREATE",
    entityType: "Item",
    entityId: item.id,
    after: item,
  });

  return {
    ...item,
    ...currentFromMovement(item),
  };
}

export async function updateItem(companyId, itemId, data, actor) {
  const existing = await prisma.item.findFirst({ where: { id: itemId, companyId } });
  if (!existing) throw new AppError("Item not found", 404);
  if (data.stockGroupId) {
    const stockGroup = await prisma.stockGroup.findFirst({ where: { id: data.stockGroupId, companyId } });
    if (!stockGroup) throw new AppError("Stock group not found", 404);
  }
  if (data.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: data.unitId, companyId } });
    if (!unit) throw new AppError("Unit not found", 404);
  }
  if (data.hsnSacId) {
    const hsnSac = await prisma.hsnSac.findFirst({ where: { id: data.hsnSacId, companyId } });
    if (!hsnSac) throw new AppError("HSN/SAC not found", 404);
  }

  const item = await prisma.item.update({
    where: { id: itemId },
    data: {
      stockGroupId: data.stockGroupId ?? existing.stockGroupId,
      unitId: data.unitId ?? existing.unitId,
      hsnSacId: data.hsnSacId ?? existing.hsnSacId,
      name: data.name ?? existing.name,
      sku: data.sku ?? existing.sku,
      barcode: data.barcode ?? existing.barcode,
      openingStockQty: data.openingStockQty !== undefined ? toDecimal(data.openingStockQty) : existing.openingStockQty,
      openingStockValuePaisa: data.openingStockValuePaisa ?? existing.openingStockValuePaisa,
      lowStockLevelQty: data.lowStockLevelQty !== undefined ? toDecimal(data.lowStockLevelQty) : existing.lowStockLevelQty,
      purchaseRatePaisa: data.purchaseRatePaisa ?? existing.purchaseRatePaisa,
      salesRatePaisa: data.salesRatePaisa ?? existing.salesRatePaisa,
      isGoods: data.isGoods ?? existing.isGoods,
      isActive: data.isActive ?? existing.isActive,
    },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "UPDATE",
    entityType: "Item",
    entityId: itemId,
    before: existing,
    after: item,
  });

  return getItem(companyId, itemId);
}

export async function deleteItem(companyId, itemId, actor) {
  const existing = await prisma.item.findFirst({ where: { id: itemId, companyId } });
  if (!existing) throw new AppError("Item not found", 404);

  const item = await prisma.item.update({
    where: { id: itemId },
    data: { isActive: false },
  });

  await writeAuditLog({
    userId: actor?.id || null,
    companyId,
    action: "DELETE",
    entityType: "Item",
    entityId: itemId,
    before: existing,
    after: item,
  });

  return item;
}

export async function recordStockMovement(tx, companyId, data) {
  const item = await tx.item.findFirst({
    where: { id: data.itemId, companyId },
    include: {
      stockMovements: { where: { isDeleted: false }, orderBy: [{ movementDate: "desc" }, { id: "desc" }], take: 1 },
    },
  });
  if (!item) throw new AppError("Item not found", 404);

  const previous = currentFromMovement(item);
  const quantity = Number(data.quantity || 0);
  const amountPaisa = Number(data.amountPaisa || 0);
  const runningQty = previous.currentQty + quantity;
  const runningValuePaisa = previous.currentValuePaisa + amountPaisa;

  return tx.stockMovement.create({
    data: {
      companyId,
      itemId: data.itemId,
      voucherId: data.voucherId ?? null,
      invoiceId: data.invoiceId ?? null,
      movementType: data.movementType,
      movementDate: new Date(data.movementDate),
      quantity: toDecimal(quantity),
      ratePaisa: data.ratePaisa ?? 0,
      amountPaisa,
      runningQty: toDecimal(runningQty),
      runningValuePaisa,
      notes: data.notes ?? "",
    },
  });
}

export async function listStockMovements(companyId, filters = {}) {
  return prisma.stockMovement.findMany({
    where: {
      companyId,
      isDeleted: false,
      ...(filters.itemId ? { itemId: Number(filters.itemId) } : {}),
      ...(filters.movementType ? { movementType: filters.movementType } : {}),
    },
    include: {
      item: true,
    },
    orderBy: [{ movementDate: "desc" }, { id: "desc" }],
  });
}

export async function stockSummary(companyId) {
  const items = await prisma.item.findMany({
    where: { companyId, isActive: true },
    include: {
      stockGroup: true,
      unit: true,
      hsnSac: true,
      stockMovements: { where: { isDeleted: false }, orderBy: [{ movementDate: "desc" }, { id: "desc" }], take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return items.map((item) => {
    const stock = currentFromMovement(item);
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      stockGroup: item.stockGroup?.name || "",
      unit: item.unit?.symbol || "",
      hsnSacCode: item.hsnSac?.code || "",
      lowStockLevelQty: Number(item.lowStockLevelQty || 0),
      ...stock,
      isLowStock: Number(stock.currentQty) <= Number(item.lowStockLevelQty || 0),
    };
  });
}

export async function lowStockItems(companyId) {
  const summary = await stockSummary(companyId);
  return summary.filter((item) => item.isLowStock);
}
