import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

// SEG-01: los secretos no pueden depender de un valor de respaldo en
// producción — si faltara la variable, cualquiera que conozca el fallback
// (está en el repositorio) podría firmar tokens válidos. El fallback solo
// se usa en desarrollo, y aun así debe cumplir el largo mínimo.
function requiredSecret(name: string, minLength: number, devFallback: string): string {
  const isProduction = (process.env.NODE_ENV ?? "development") === "production";
  const value = process.env[name];

  if (isProduction) {
    if (!value) {
      throw new Error(`Falta la variable de entorno requerida: ${name} (no se permite valor de respaldo en producción)`);
    }
    if (value.length < minLength) {
      throw new Error(`${name} debe tener al menos ${minLength} caracteres.`);
    }
    return value;
  }

  const resolved = value ?? devFallback;
  if (resolved.length < minLength) {
    throw new Error(`${name} debe tener al menos ${minLength} caracteres.`);
  }
  return resolved;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required("DATABASE_URL"),
  corsOrigins: (process.env.CORS_ORIGINS ?? "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Módulo 04 — Cuentas de usuario.
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  jwtAccessSecret: requiredSecret("JWT_ACCESS_SECRET", 32, "dev-access-secret-cambiar-en-produccion"),
  jwtAccessTtlMinutes: Number(process.env.JWT_ACCESS_TTL_MINUTES ?? 15),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  emailVerificationTtlHours: Number(process.env.EMAIL_VERIFICATION_TTL_HOURS ?? 24),
  passwordResetTtlHours: Number(process.env.PASSWORD_RESET_TTL_HOURS ?? 1),
  cookieSecure: (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === "production" ? "true" : "false")) === "true",

  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "no-responder@eltesoro.gt",
  emailFromName: process.env.EMAIL_FROM_NAME ?? "Almacén El Tesoro",
};
