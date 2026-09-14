import { Router } from "express";
import { getShippingMethodsController, getCheckoutConfigController } from "../../controllers/checkout.controller";
import { optionalAuth } from "../../middlewares/optionalAuth.middleware";

export const checkoutRouter = Router();

// Anónimo por diseño (mismo criterio que /cart) — cualquier visitante debe
// poder ver costos de envío antes de decidir si crea cuenta o compra como
// invitado.
checkoutRouter.use(optionalAuth);

checkoutRouter.get("/shipping-methods", getShippingMethodsController);
checkoutRouter.get("/config", getCheckoutConfigController);
