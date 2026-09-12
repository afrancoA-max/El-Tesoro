import { Router } from "express";
import { getCategoriesController } from "../../controllers/categories.controller";
import { getCategoryFacetsController, listProductsByCategoryController } from "../../controllers/products.controller";

export const categoriesRouter = Router();

categoriesRouter.get("/", getCategoriesController);
categoriesRouter.get("/:slug/products", listProductsByCategoryController);
categoriesRouter.get("/:slug/facets", getCategoryFacetsController);
