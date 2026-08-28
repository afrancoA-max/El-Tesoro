import type { NextFunction, Request, Response } from "express";
import { listCollectionProducts, listCollections } from "../services/collections.service";
import { parsePagination } from "../utils/pagination";

export async function listCollectionsController(_req: Request, res: Response, next: NextFunction) {
  try {
    const collections = await listCollections();
    res.json({ success: true, data: collections });
  } catch (error) {
    next(error);
  }
}

export async function listCollectionProductsController(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const result = await listCollectionProducts(req.params.slug, pagination);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
