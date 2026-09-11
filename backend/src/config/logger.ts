import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
  // SEG-03: pino-http registra los headers de cada request/response por
  // defecto. Sin esto, las cookies de sesión (eltesoro_at, eltesoro_rt,
  // eltesoro_cart) y el header Authorization quedaban en texto plano en
  // Cloud Logging — cualquiera con acceso de lectura ahí podía secuestrar
  // sesiones copiando la cookie de otro usuario.
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
    censor: "[REDACTED]",
  },
});
