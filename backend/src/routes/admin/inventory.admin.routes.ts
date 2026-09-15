import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { adjustStockController, listAdjustmentsController, listInventoryController } from "../../controllers/inventoryAdmin.controller";

export const inventoryAdminRouter = Router();

inventoryAdminRouter.get("/", requirePermission("inventory:read"), listInventoryController);
inventoryAdminRouter.get("/:variantId/adjustments", requirePermission("inventory:read"), listAdjustmentsController);
inventoryAdminRouter.patch("/:variantId", requirePermission("inventory:adjust"), adjustStockController);
