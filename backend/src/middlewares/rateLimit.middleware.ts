import rateLimit from "express-rate-limit";

/// Limita intentos por IP en rutas sensibles (checklist del módulo 04:
/// "los intentos de login fallidos se limitan"). En memoria: suficiente
/// para una sola instancia; si el backend escala horizontalmente, migrar
/// el store a Redis.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Intenta de nuevo en unos minutos." } },
});

export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Intenta de nuevo en unos minutos." } },
});

export const newsletterRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Intenta de nuevo en unos minutos." } },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Intenta de nuevo en unos minutos." } },
});
