import { Router } from "express";
import { getSitemapController } from "../../controllers/sitemap.controller";

export const sitemapRouter = Router();

sitemapRouter.get("/", getSitemapController);
