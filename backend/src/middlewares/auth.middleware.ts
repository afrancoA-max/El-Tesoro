import type { NextFunction, Request, Response } from "express";
import { Role } from "@el-tesoro/shared";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/tokens";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

function extractAccessToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice("Bearer ".length);
  return req.cookies?.eltesoro_at;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    next(AppError.unauthorized("NOT_AUTHENTICATED", "No autenticado."));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(AppError.unauthorized("NOT_AUTHENTICATED", "Sesión inválida o expirada."));
  }
}
