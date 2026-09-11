import type { NextFunction, Request, Response } from "express";
import { listStaffInventoryByCategory, searchStaffInventory } from "../services/staffInventory.service";
import { parsePagination } from "../utils/pagination";
import { staffInventoryQuerySchema } from "../validators/staffInventory.validator";

export async function searchStaffInventoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = staffInventoryQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const result = await searchStaffInventory(query.q, pagination);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listStaffInventoryByCategoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req.query);
    const result = await listStaffInventoryByCategory(req.params.slug, pagination);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
