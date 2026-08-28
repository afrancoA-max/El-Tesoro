import type { NextFunction, Request, Response } from "express";
import { getCategoryTree } from "../services/categories.service";

export async function getCategoriesController(_req: Request, res: Response, next: NextFunction) {
  try {
    const tree = await getCategoryTree();
    res.json({ success: true, data: tree });
  } catch (error) {
    next(error);
  }
}
