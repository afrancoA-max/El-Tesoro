import type { NextFunction, Request, Response } from "express";
import { ProductStatus } from "@prisma/client";
import * as catalogAdmin from "../services/catalogAdmin.service";
import { AppError } from "../utils/AppError";
import { parsePagination } from "../utils/pagination";
import {
  addImageBodySchema,
  categoryInputSchema,
  productEstadoSchema,
  productInputSchema,
  productListQuerySchema,
  reorderImagesSchema,
  variantInputSchema,
} from "../validators/catalogAdmin.validator";

export async function listCategoriesController(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await catalogAdmin.listCategoriesAdmin() });
  } catch (error) {
    next(error);
  }
}

export async function createCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = categoryInputSchema.parse(req.body);
    res.status(201).json({ success: true, data: await catalogAdmin.createCategory(input) });
  } catch (error) {
    next(error);
  }
}

export async function updateCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = categoryInputSchema.parse(req.body);
    res.json({ success: true, data: await catalogAdmin.updateCategory(req.params.id, input) });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    await catalogAdmin.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listProductsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = productListQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const result = await catalogAdmin.listAdminProducts(
      { q: query.q, categoriaId: query.categoriaId, estado: query.estado as ProductStatus | undefined },
      pagination,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getProductController(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await catalogAdmin.getAdminProductDetail(req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function createProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = productInputSchema.parse(req.body);
    res.status(201).json({ success: true, data: await catalogAdmin.createProduct(input) });
  } catch (error) {
    next(error);
  }
}

export async function updateProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = productInputSchema.parse(req.body);
    res.json({ success: true, data: await catalogAdmin.updateProduct(req.params.id, input) });
  } catch (error) {
    next(error);
  }
}

export async function setProductEstadoController(req: Request, res: Response, next: NextFunction) {
  try {
    const { estado } = productEstadoSchema.parse(req.body);
    res.json({ success: true, data: await catalogAdmin.setProductEstado(req.params.id, estado) });
  } catch (error) {
    next(error);
  }
}

export async function deleteProductController(req: Request, res: Response, next: NextFunction) {
  try {
    await catalogAdmin.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function createVariantController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = variantInputSchema.parse(req.body);
    res.status(201).json({ success: true, data: await catalogAdmin.createVariant(req.params.id, input) });
  } catch (error) {
    next(error);
  }
}

export async function updateVariantController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = variantInputSchema.omit({ cantidadDisponible: true }).parse(req.body);
    res.json({ success: true, data: await catalogAdmin.updateVariant(req.params.variantId, input) });
  } catch (error) {
    next(error);
  }
}

export async function deleteVariantController(req: Request, res: Response, next: NextFunction) {
  try {
    await catalogAdmin.deleteVariant(req.params.variantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function addProductImageController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw AppError.badRequest("IMAGE_REQUIRED", "Adjunta un archivo de imagen en el campo 'imagen'.");
    const body = addImageBodySchema.parse(req.body);
    const image = await catalogAdmin.addProductImage(
      req.params.id,
      { buffer: req.file.buffer, mimetype: req.file.mimetype },
      { textoAlternativo: body.textoAlternativo, variantId: body.variantId },
    );
    res.status(201).json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
}

export async function reorderProductImagesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderedImageIds } = reorderImagesSchema.parse(req.body);
    await catalogAdmin.reorderProductImages(req.params.id, orderedImageIds);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function deleteProductImageController(req: Request, res: Response, next: NextFunction) {
  try {
    await catalogAdmin.deleteProductImage(req.params.imageId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
