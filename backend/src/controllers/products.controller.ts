import type { NextFunction, Request, Response } from "express";
import { getProductBySlug, listProductsByCategory } from "../services/products.service";
import { parsePagination } from "../utils/pagination";
import { productListQuerySchema } from "../validators/productList.validator";

export async function listProductsByCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = productListQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);

    const result = await listProductsByCategory(
      req.params.slug,
      {
        precioMin: query.precioMin,
        precioMax: query.precioMax,
        marca: query.marca,
        material: query.material,
        disponible: query.disponible,
        sort: query.sort,
      },
      pagination,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getProductController(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await getProductBySlug(req.params.slug);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}
