import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/tokens";

function extractAccessToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice("Bearer ".length);
  return req.cookies?.eltesoro_at;
}

/// A diferencia de `requireAuth`, nunca rechaza la petición: el carrito
/// (Módulo 05) es anónimo por diseño (ver docs/plan/04-cuentas-usuario.md) y
/// debe funcionar igual con o sin sesión. Si el token existe pero es
/// inválido/expirado, se ignora silenciosamente (el request sigue como
/// invitado) en vez de devolver 401.
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // Token presente pero inválido — se sigue como invitado.
  }
  next();
}
