import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const INTERNAL_CLIENT_IP_HEADER = "x-internal-client-ip";
const INTERNAL_PROXY_SECRET_HEADER = "x-internal-proxy-secret";

/// SEG-02: sin esto, todas las requests llegan por el proxy same-origin de
/// Next (frontend/src/app/api/[...path]/route.ts) y el backend ve siempre
/// la misma IP interna — el límite de intentos se comparte entre todos los
/// usuarios en vez de aplicarse por cliente. El proxy de Next reenvía la IP
/// real del navegador en un header propio junto con INTERNAL_PROXY_SECRET;
/// solo se confía en ese header si el secreto coincide (evita que un
/// llamador externo falsee su propia IP para evadir el límite). Si el
/// secreto no está configurado o no coincide, se usa req.ip tal como antes.
function resolveClientIp(req: Request): string {
  const secret = env.internalProxySecret;
  if (secret) {
    const providedSecret = req.headers[INTERNAL_PROXY_SECRET_HEADER];
    if (providedSecret === secret) {
      const forwardedIp = req.headers[INTERNAL_CLIENT_IP_HEADER];
      if (typeof forwardedIp === "string" && forwardedIp.trim()) {
        return forwardedIp.trim();
      }
    }
  }
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function ipKeyGeneratorFor(req: Request): string {
  return resolveClientIp(req);
}

/// NUEVO-04: `express-rate-limit` valida por defecto que si llega un header
/// `X-Forwarded-For` (algo que el proxy de Next SIEMPRE reenvía tal cual,
/// junto con nuestro `x-internal-client-ip` propio) `trust proxy` esté
/// habilitado — si no, lo trata como una posible mala configuración. Aquí es
/// un falso positivo a propósito: `resolveClientIp` arriba nunca lee
/// `X-Forwarded-For` ni depende de `trust proxy`/`req.ip`, así que esa
/// validación no aplica y solo ensuciaría los logs.
const RATE_LIMIT_VALIDATE = { xForwardedForHeader: false };

// INF-04: estos limiters son singletons de módulo (su contador vive en
// memoria mientras dure el proceso) — en las pruebas de integración, todas
// las requests salen de la misma IP y varias pruebas legítimas y sin
// relación entre sí registran/inician sesión más veces de las que el límite
// real permite. Desactivarlo solo bajo NODE_ENV=test dentro de esta función
// exportada (nunca en producción ni en desarrollo) evita que las pruebas se
// bloqueen entre sí sin tocar el comportamiento que sí importa proteger.
function skipInTests(): boolean {
  return env.nodeEnv === "test";
}

/// Limita intentos por IP en rutas sensibles (checklist del módulo 04:
/// "los intentos de login fallidos se limitan"). En memoria: suficiente
/// para una sola instancia; si el backend escala horizontalmente, migrar
/// el store a Redis.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  validate: RATE_LIMIT_VALIDATE,
  limit: 10,
  standardHeaders: true,
  skip: skipInTests,
  legacyHeaders: false,
  keyGenerator: ipKeyGeneratorFor,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Intenta de nuevo en unos minutos." } },
});

/// SEG-02: además del límite por IP, un límite por correo — así un
/// atacante no puede aprovechar el techo compartido por IP (10/15min) para
/// probar contraseñas de una sola cuenta objetivo desde IPs distintas.
export const loginEmailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  validate: RATE_LIMIT_VALIDATE,
  limit: 5,
  standardHeaders: true,
  skip: skipInTests,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return email ? `email:${email}` : ipKeyGeneratorFor(req);
  },
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos con este correo. Intenta de nuevo en unos minutos." } },
});

export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  validate: RATE_LIMIT_VALIDATE,
  limit: 5,
  standardHeaders: true,
  skip: skipInTests,
  legacyHeaders: false,
  keyGenerator: ipKeyGeneratorFor,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Intenta de nuevo en unos minutos." } },
});

export const newsletterRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  validate: RATE_LIMIT_VALIDATE,
  limit: 5,
  standardHeaders: true,
  skip: skipInTests,
  legacyHeaders: false,
  keyGenerator: ipKeyGeneratorFor,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Intenta de nuevo en unos minutos." } },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  validate: RATE_LIMIT_VALIDATE,
  limit: 5,
  standardHeaders: true,
  skip: skipInTests,
  legacyHeaders: false,
  keyGenerator: ipKeyGeneratorFor,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Intenta de nuevo en unos minutos." } },
});
