import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../utils/tokens";

/// Header que le dice al cliente HTTP del frontend "tenías una sesión, pero
/// el access token ya venció" — a diferencia de un 401 normal, esta ruta
/// igual respondió 200 (carrito de invitado), así que sin esta señal el
/// cliente no tiene forma de saber que debía refrescar antes de degradar la
/// sesión (CAR-01). Ver services/httpClient.ts en el frontend.
export const TOKEN_EXPIRED_HEADER = "X-Access-Token-Expired";

function extractAccessToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice("Bearer ".length);
  return req.cookies?.eltesoro_at;
}

/// A diferencia de `requireAuth`, nunca rechaza la petición: el carrito
/// (Módulo 05) es anónimo por diseño (ver docs/plan/04-cuentas-usuario.md) y
/// debe funcionar igual con o sin sesión. Si el token existe pero es
/// inválido, se ignora silenciosamente (el request sigue como invitado).
///
/// CAR-01: si el token existe pero está *expirado* (no simplemente ausente
/// o corrupto), se distingue con un header de respuesta en vez de tratarlo
/// igual que "sin token" — así el cliente HTTP puede refrescar y reintentar
/// en vez de mostrarle al usuario un carrito de invitado vacío.
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.setHeader(TOKEN_EXPIRED_HEADER, "1");
    }
    // Token presente pero inválido/expirado — se sigue como invitado.
  }
  next();
}
