import { Router } from "express";
import { createOrderController, getOrderController } from "../../controllers/checkout.controller";
import { optionalAuth } from "../../middlewares/optionalAuth.middleware";

export const ordersRouter = Router();

// Anónimo por diseño: el checkout de invitado (skill retail-cart-checkout,
// sección 5) crea la orden sin sesión. Si hay sesión, `optionalAuth` la
// adjunta para precargar cuenta y para que `GET /orders/:numero` reconozca
// al dueño sin necesitar el token de acceso de invitado.
ordersRouter.use(optionalAuth);

ordersRouter.post("/", createOrderController);
ordersRouter.get("/:numero", getOrderController);
