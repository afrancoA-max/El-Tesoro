import { Router } from "express";
import { requirePermission } from "../../middlewares/permission.middleware";
import { exportSalesCsvController, getSalesSummaryController } from "../../controllers/reportsAdmin.controller";

export const reportsAdminRouter = Router();

const read = requirePermission("reports:read");

reportsAdminRouter.get("/sales", read, getSalesSummaryController);
reportsAdminRouter.get("/sales/export.csv", read, exportSalesCsvController);
