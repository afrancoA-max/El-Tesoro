import { Router } from "express";
import {
  getCartController,
  addCartItemController,
  updateCartItemController,
  deleteCartItemController,
  mergeCartController,
} from "../../controllers/cart.controller";
import { optionalAuth } from "../../middlewares/optionalAuth.middleware";
import { requireAuth } from "../../middlewares/auth.middleware";

export const cartRouter = Router();

// El carrito es anónimo por diseño (docs/plan/04-cuentas-usuario.md): estas
// rutas funcionan con o sin sesión, por eso usan `optionalAuth` y no
// `requireAuth`.
cartRouter.use(optionalAuth);

cartRouter.get("/", getCartController);
cartRouter.post("/items", addCartItemController);
cartRouter.patch("/items/:id", updateCartItemController);
cartRouter.delete("/items/:id", deleteCartItemController);

// Fusionar el carrito anónimo con el de la cuenta sí exige sesión iniciada
// (es justo lo que acaba de pasar cuando el frontend la llama).
cartRouter.post("/merge", requireAuth, mergeCartController);
