import type { NextFunction, Request, Response } from "express";
import { hasPermission, Permission } from "@el-tesoro/shared";
import { AppError } from "../utils/AppError";

// Módulo 08 — Panel admin: capa fina sobre `requireRole` que autoriza por
// PERMISO en vez de por rol explícito — la matriz vive en
// shared/src/permissions.ts (fuente única, también usada por el frontend
// para no ofrecer una acción que aquí igual se rechazaría). Requiere
// `requireAuth` antes en la cadena de middlewares.
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized("NOT_AUTHENTICATED", "No autenticado."));
      return;
    }
    const allowed = permissions.every((permission) => hasPermission(req.user!.role, permission));
    if (!allowed) {
      next(AppError.forbidden("FORBIDDEN", "No tienes permiso para esta acción."));
      return;
    }
    next();
  };
}
