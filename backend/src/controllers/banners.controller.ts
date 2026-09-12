import type { NextFunction, Request, Response } from "express";
import { getActiveBanners } from "../services/banners.service";

export async function getBannersController(_req: Request, res: Response, next: NextFunction) {
  try {
    const banners = await getActiveBanners();
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
}
