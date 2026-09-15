import { Router } from "express";
import { getHostedCheckoutFormController } from "../../controllers/payments.controller";
import { optionalAuth } from "../../middlewares/optionalAuth.middleware";
import { paymentAttemptRateLimiter } from "../../middlewares/rateLimit.middleware";

export const paymentsRouter = Router();

// Anónimo por diseño, igual que /orders: el checkout de invitado necesita
// poder pagar sin cuenta; `optionalAuth` adjunta la sesión cuando existe
// para que el dueño autenticado no necesite el token de invitado.
paymentsRouter.use(optionalAuth);

paymentsRouter.get("/orders/:numero/hosted-checkout-form", paymentAttemptRateLimiter, getHostedCheckoutFormController);
