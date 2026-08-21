import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { validate } from "../middleware/validate.js";
import { resolveCompany } from "../middleware/companyContext.js";
import {
  hsnSacSchema,
  inventoryQuerySchema,
  itemSchema,
  stockGroupSchema,
  stockMovementSchema,
  unitSchema,
} from "../validators/inventoryValidators.js";
import {
  createHsnSacController,
  createItemController,
  createStockGroupController,
  createStockMovementController,
  createUnitController,
  deleteHsnSacController,
  deleteItemController,
  deleteStockGroupController,
  deleteUnitController,
  getItemController,
  listHsnSacController,
  listItemsController,
  listStockGroupsController,
  listStockMovementsController,
  listUnitsController,
  lowStockItemsController,
  stockSummaryController,
  updateHsnSacController,
  updateItemController,
  updateStockGroupController,
  updateUnitController,
} from "../controllers/inventoryController.js";

export const inventoryRoutes = Router();

inventoryRoutes.use(authenticate, resolveCompany);

inventoryRoutes.get("/stock-groups", listStockGroupsController);
inventoryRoutes.post("/stock-groups", requireRole("ADMIN", "ACCOUNTANT"), validate(stockGroupSchema), createStockGroupController);
inventoryRoutes.put("/stock-groups/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(stockGroupSchema), updateStockGroupController);
inventoryRoutes.delete("/stock-groups/:id", requireRole("ADMIN", "ACCOUNTANT"), deleteStockGroupController);

inventoryRoutes.get("/units", listUnitsController);
inventoryRoutes.post("/units", requireRole("ADMIN", "ACCOUNTANT"), validate(unitSchema), createUnitController);
inventoryRoutes.put("/units/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(unitSchema), updateUnitController);
inventoryRoutes.delete("/units/:id", requireRole("ADMIN", "ACCOUNTANT"), deleteUnitController);

inventoryRoutes.get("/hsn-sac", validate(inventoryQuerySchema, "query"), listHsnSacController);
inventoryRoutes.post("/hsn-sac", requireRole("ADMIN", "ACCOUNTANT"), validate(hsnSacSchema), createHsnSacController);
inventoryRoutes.put("/hsn-sac/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(hsnSacSchema.partial()), updateHsnSacController);
inventoryRoutes.delete("/hsn-sac/:id", requireRole("ADMIN", "ACCOUNTANT"), deleteHsnSacController);

inventoryRoutes.get("/items", validate(inventoryQuerySchema, "query"), listItemsController);
inventoryRoutes.get("/items/:id", getItemController);
inventoryRoutes.post("/items", requireRole("ADMIN", "ACCOUNTANT"), validate(itemSchema), createItemController);
inventoryRoutes.put("/items/:id", requireRole("ADMIN", "ACCOUNTANT"), validate(itemSchema.partial()), updateItemController);
inventoryRoutes.delete("/items/:id", requireRole("ADMIN", "ACCOUNTANT"), deleteItemController);

inventoryRoutes.get("/movements", validate(inventoryQuerySchema, "query"), listStockMovementsController);
inventoryRoutes.post("/movements", requireRole("ADMIN", "ACCOUNTANT"), validate(stockMovementSchema), createStockMovementController);

inventoryRoutes.get("/summary", stockSummaryController);
inventoryRoutes.get("/alerts/low-stock", lowStockItemsController);
