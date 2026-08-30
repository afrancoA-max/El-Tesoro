import type { NextFunction, Request, Response } from "express";
import { Role } from "@el-tesoro/shared";
import { AppError } from "../utils/AppError";

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized("NOT_AUTHENTICATED", "No autenticado."));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden("FORBIDDEN", "No tienes permiso para esta acción."));
      return;
    }
    next();
  };
}
