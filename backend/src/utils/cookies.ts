import type { Response } from "express";
import { env } from "../config/env";
import type { Tokens } from "../services/auth.service";

const ACCESS_COOKIE = "eltesoro_at";
const REFRESH_COOKIE = "eltesoro_rt";
const CART_COOKIE = "eltesoro_cart";

/// Caducidad del carrito anónimo — 30 días, confirmado con el negocio
/// (docs/plan/05-carrito.md, sección 6). El carrito en sí también se trata
/// como expirado del lado del servidor si no se toca en ese plazo (ver
/// cart.service.ts), así que esta cookie es la primera línea de limpieza.
const CART_COOKIE_TTL_DAYS = 30;

/// httpOnly en ambas: el access token de corta duración también viaja en
/// cookie (no solo Authorization header) para que el frontend Next.js no
/// tenga que guardar tokens en localStorage/JS accesible (XSS).
export function setAuthCookies(res: Response, tokens: Tokens): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: env.jwtAccessTtlMinutes * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/api/auth",
    expires: tokens.refreshTokenExpiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

export function getRefreshCookieName(): string {
  return REFRESH_COOKIE;
}

export function getCartCookieName(): string {
  return CART_COOKIE;
}

export function setCartTokenCookie(res: Response, cartToken: string): void {
  res.cookie(CART_COOKIE, cartToken, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearCartTokenCookie(res: Response): void {
  res.clearCookie(CART_COOKIE, { path: "/" });
}
