import type { NextFunction, Request, Response } from "express";
import * as inventoryAdmin from "../services/inventoryAdmin.service";
import { parsePagination } from "../utils/pagination";
import { adjustStockSchema, inventoryListQuerySchema } from "../validators/inventoryAdmin.validator";

export async function listInventoryController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = inventoryListQuerySchema.parse(req.query);
    const pagination = parsePagination(req.query);
    const result = await inventoryAdmin.listAdminInventory({ q: query.q, soloStockBajo: query.soloStockBajo === "true" }, pagination);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function adjustStockController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = adjustStockSchema.parse(req.body);
    const adjustment = await inventoryAdmin.adjustStock(req.params.variantId, input, req.user!.id);
    res.status(201).json({ success: true, data: adjustment });
  } catch (error) {
    next(error);
  }
}

export async function listAdjustmentsController(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await inventoryAdmin.listAdjustmentsForVariant(req.params.variantId) });
  } catch (error) {
    next(error);
  }
}
