import { Router } from "express";
import { getBannersController } from "../../controllers/banners.controller";

export const bannersRouter = Router();

bannersRouter.get("/", getBannersController);
