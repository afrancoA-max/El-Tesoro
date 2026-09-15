import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { uploadCatalogFile, uploadProductImage } from "../../middlewares/upload.middleware";
import {
  addProductImageController,
  createCategoryController,
  createProductController,
  createVariantController,
  deleteCategoryController,
  deleteProductController,
  deleteProductImageController,
  deleteVariantController,
  getProductController,
  listCategoriesController,
  listProductsController,
  reorderProductImagesController,
  setProductEstadoController,
  updateCategoryController,
  updateProductController,
  updateVariantController,
} from "../../controllers/catalogAdmin.controller";
import { importCatalogController } from "../../controllers/catalogImport.controller";

export const catalogAdminRouter = Router();

const read = requirePermission("catalog:read");
const write = requirePermission("catalog:write");

catalogAdminRouter.get("/categories", read, listCategoriesController);
catalogAdminRouter.post("/categories", write, createCategoryController);
catalogAdminRouter.put("/categories/:id", write, updateCategoryController);
catalogAdminRouter.delete("/categories/:id", write, deleteCategoryController);

catalogAdminRouter.get("/products", read, listProductsController);
catalogAdminRouter.post("/products", write, createProductController);
catalogAdminRouter.get("/products/:id", read, getProductController);
catalogAdminRouter.put("/products/:id", write, updateProductController);
catalogAdminRouter.patch("/products/:id/estado", write, setProductEstadoController);
catalogAdminRouter.delete("/products/:id", write, deleteProductController);

catalogAdminRouter.post("/products/:id/variants", write, createVariantController);
catalogAdminRouter.put("/variants/:variantId", write, updateVariantController);
catalogAdminRouter.delete("/variants/:variantId", write, deleteVariantController);

catalogAdminRouter.post("/products/:id/images", write, uploadProductImage, addProductImageController);
catalogAdminRouter.put("/products/:id/images/reorder", write, reorderProductImagesController);
catalogAdminRouter.delete("/images/:imageId", write, deleteProductImageController);

// Módulo 08: "el importador CSV del módulo 02 queda integrado aquí como
// herramienta de carga masiva" — permiso propio (`catalog:import`, solo
// admin hoy, ver shared/src/permissions.ts) porque re-subir el Excel puede
// tocar cientos de productos a la vez, más sensible que un CRUD puntual.
catalogAdminRouter.post("/import", requirePermission("catalog:import"), uploadCatalogFile, importCatalogController);
