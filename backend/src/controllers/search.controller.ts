import type { NextFunction, Request, Response } from "express";
import { searchProducts } from "../services/search.service";
import { parsePagination } from "../utils/pagination";
import { searchQuerySchema } from "../validators/productList.validator";

export async function searchController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = searchQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const result = await searchProducts(query.q, pagination);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
