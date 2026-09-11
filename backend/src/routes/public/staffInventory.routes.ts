import { Router } from "express";
import { listStaffInventoryByCategoryController, searchStaffInventoryController } from "../../controllers/staffInventory.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/roles.middleware";

export const staffInventoryRouter = Router();

// Consulta interna de precio y existencias — solo personal admin, nunca
// público (a diferencia de /search, que solo expone disponible: boolean).
staffInventoryRouter.use(requireAuth, requireRole("admin"));

staffInventoryRouter.get("/", searchStaffInventoryController);
staffInventoryRouter.get("/by-category/:slug", listStaffInventoryByCategoryController);
