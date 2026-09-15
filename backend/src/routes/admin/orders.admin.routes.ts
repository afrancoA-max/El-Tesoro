import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import {
  advanceOrderController,
  cancelOrderController,
  confirmPaymentController,
  getOrderController,
  listOrdersController,
} from "../../controllers/orderAdmin.controller";

export const ordersAdminRouter = Router();

const read = requirePermission("orders:read");

ordersAdminRouter.get("/", read, listOrdersController);
ordersAdminRouter.get("/:id", read, getOrderController);
ordersAdminRouter.post("/:id/confirm-payment", requirePermission("orders:confirm_payment"), confirmPaymentController);
ordersAdminRouter.post("/:id/advance", requirePermission("orders:advance"), advanceOrderController);
ordersAdminRouter.post("/:id/cancel", requirePermission("orders:cancel"), cancelOrderController);
