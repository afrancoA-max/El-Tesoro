import { Router } from "express";
import { searchController } from "../../controllers/search.controller";

export const searchRouter = Router();

searchRouter.get("/", searchController);
