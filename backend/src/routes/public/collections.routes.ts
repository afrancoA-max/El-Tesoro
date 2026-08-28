import { Router } from "express";
import { listCollectionProductsController, listCollectionsController } from "../../controllers/collections.controller";

export const collectionsRouter = Router();

collectionsRouter.get("/", listCollectionsController);
collectionsRouter.get("/:slug/products", listCollectionProductsController);
