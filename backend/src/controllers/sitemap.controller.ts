import type { NextFunction, Request, Response } from "express";
import { getSitemapData } from "../services/sitemap.service";

export async function getSitemapController(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getSitemapData();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
