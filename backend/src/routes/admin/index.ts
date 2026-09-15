import { Router } from "express";
import { ADMIN_PANEL_ROLES, permissionsFor } from "@el-tesoro/shared";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/roles.middleware";
import { catalogAdminRouter } from "./catalog.admin.routes";
import { inventoryAdminRouter } from "./inventory.admin.routes";
import { ordersAdminRouter } from "./orders.admin.routes";
import { reportsAdminRouter } from "./reports.admin.routes";
import { usersAdminRouter } from "./users.admin.routes";

export const adminRouter = Router();

// Puerta de entrada del panel completo: cualquier rol del panel (admin,
// staff/gerente, operador, servicio_cliente) puede entrar a /api/admin —
// cada sub-router después exige el PERMISO puntual de cada acción (ver
// shared/src/permissions.ts). Nunca confiar solo en que el frontend oculte
// un botón: esta capa es la que de verdad protege cada endpoint.
adminRouter.use(requireAuth, requireRole(...ADMIN_PANEL_ROLES));

// El frontend usa esto para saber qué mostrar en el menú sin adivinar por
// rol — una sola fuente de verdad (shared/src/permissions.ts) en vez de
// reimplementar la matriz en el cliente.
adminRouter.get("/me", (req, res) => {
  res.json({ success: true, data: { role: req.user!.role, permissions: permissionsFor(req.user!.role) } });
});

adminRouter.use("/catalog", catalogAdminRouter);
adminRouter.use("/inventory", inventoryAdminRouter);
adminRouter.use("/orders", ordersAdminRouter);
adminRouter.use("/reports", reportsAdminRouter);
adminRouter.use("/users", usersAdminRouter);
