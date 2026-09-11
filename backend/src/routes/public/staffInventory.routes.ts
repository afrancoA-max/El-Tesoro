import { Router } from "express";
import { listStaffInventoryByCategoryController, searchStaffInventoryController } from "../../controllers/staffInventory.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/roles.middleware";

export const staffInventoryRouter = Router();

// Consulta interna de precio y existencias — solo personal de tienda o
// admin, nunca público (a diferencia de /search, que solo expone
// disponible: boolean). SEG-04: antes exigía "admin"; ahora el rol "staff"
// (menor privilegio) también entra, sin necesitar ser admin.
staffInventoryRouter.use(requireAuth, requireRole("admin", "staff"));

staffInventoryRouter.get("/", searchStaffInventoryController);
staffInventoryRouter.get("/by-category/:slug", listStaffInventoryByCategoryController);
