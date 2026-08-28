import { Router } from "express";
import { getProductController } from "../../controllers/products.controller";

export const productsRouter = Router();

productsRouter.get("/:slug", getProductController);
