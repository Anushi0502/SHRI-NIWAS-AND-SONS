import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createHsnSac,
  createItem,
  createStockGroup,
  createUnit,
  deleteHsnSac,
  deleteItem,
  deleteStockGroup,
  deleteUnit,
  getItem,
  listHsnSac,
  listItems,
  listStockGroups,
  listStockMovements,
  listUnits,
  lowStockItems,
  recordStockMovement,
  stockSummary,
  updateHsnSac,
  updateItem,
  updateStockGroup,
  updateUnit,
} from "../services/inventoryService.js";
import { prisma } from "../config/prisma.js";

export const listStockGroupsController = asyncHandler(async (req, res) => {
  const stockGroups = await listStockGroups(req.companyId);
  res.json({ stockGroups });
});

export const createStockGroupController = asyncHandler(async (req, res) => {
  const stockGroup = await createStockGroup(req.companyId, req.validated, req.user);
  res.status(201).json({ stockGroup });
});

export const updateStockGroupController = asyncHandler(async (req, res) => {
  const stockGroup = await updateStockGroup(req.companyId, Number(req.params.id), req.validated, req.user);
  res.json({ stockGroup });
});

export const deleteStockGroupController = asyncHandler(async (req, res) => {
  await deleteStockGroup(req.companyId, Number(req.params.id), req.user);
  res.json({ ok: true });
});

export const listUnitsController = asyncHandler(async (req, res) => {
  const units = await listUnits(req.companyId);
  res.json({ units });
});

export const createUnitController = asyncHandler(async (req, res) => {
  const unit = await createUnit(req.companyId, req.validated, req.user);
  res.status(201).json({ unit });
});

export const updateUnitController = asyncHandler(async (req, res) => {
  const unit = await updateUnit(req.companyId, Number(req.params.id), req.validated, req.user);
  res.json({ unit });
});

export const deleteUnitController = asyncHandler(async (req, res) => {
  await deleteUnit(req.companyId, Number(req.params.id), req.user);
  res.json({ ok: true });
});

export const listHsnSacController = asyncHandler(async (req, res) => {
  const hsnSacs = await listHsnSac(req.companyId, String(req.query.search || ""));
  res.json({ hsnSacs });
});

export const createHsnSacController = asyncHandler(async (req, res) => {
  const hsnSac = await createHsnSac(req.companyId, req.validated, req.user);
  res.status(201).json({ hsnSac });
});

export const updateHsnSacController = asyncHandler(async (req, res) => {
  const hsnSac = await updateHsnSac(req.companyId, Number(req.params.id), req.validated, req.user);
  res.json({ hsnSac });
});

export const deleteHsnSacController = asyncHandler(async (req, res) => {
  await deleteHsnSac(req.companyId, Number(req.params.id), req.user);
  res.json({ ok: true });
});

export const listItemsController = asyncHandler(async (req, res) => {
  const items = await listItems(req.companyId, String(req.query.search || ""));
  res.json({ items });
});

export const getItemController = asyncHandler(async (req, res) => {
  const item = await getItem(req.companyId, Number(req.params.id));
  res.json({ item });
});

export const createItemController = asyncHandler(async (req, res) => {
  const item = await createItem(req.companyId, req.validated, req.user);
  res.status(201).json({ item });
});

export const updateItemController = asyncHandler(async (req, res) => {
  const item = await updateItem(req.companyId, Number(req.params.id), req.validated, req.user);
  res.json({ item });
});

export const deleteItemController = asyncHandler(async (req, res) => {
  await deleteItem(req.companyId, Number(req.params.id), req.user);
  res.json({ ok: true });
});

export const listStockMovementsController = asyncHandler(async (req, res) => {
  const movements = await listStockMovements(req.companyId, req.validated);
  res.json({ movements });
});

export const createStockMovementController = asyncHandler(async (req, res) => {
  const movement = await prisma.$transaction(async (tx) => recordStockMovement(tx, req.companyId, req.validated));
  res.status(201).json({ movement });
});

export const stockSummaryController = asyncHandler(async (req, res) => {
  const summary = await stockSummary(req.companyId);
  res.json({ summary });
});

export const lowStockItemsController = asyncHandler(async (req, res) => {
  const items = await lowStockItems(req.companyId);
  res.json({ items });
});
