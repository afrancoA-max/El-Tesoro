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

// SEG-05: con CORS_ORIGINS=* y credentials:true (app.ts), cualquier sitio
// puede leer respuestas autenticadas (cookies) de un usuario que las visite
// — el origin debe ser una lista cerrada, nunca "*", en producción.
function readCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? "*";
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isProduction = (process.env.NODE_ENV ?? "development") === "production";
  if (isProduction && (origins.length === 0 || origins.includes("*"))) {
    throw new Error("CORS_ORIGINS debe ser la URL exacta del frontend en producción; no se permite \"*\".");
  }

  return origins;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required("DATABASE_URL"),
  corsOrigins: readCorsOrigins(),

  // Módulo 04 — Cuentas de usuario.
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  // Módulo 07 — pagos: URL pública de este backend, para armar
  // `override_custom_receipt_page`/`override_custom_cancel_page` de Secure
  // Acceptance — el navegador del cliente vuelve directo aquí después de
  // pagar en la página hospedada de CyberSource (nunca pasa por el proxy
  // de Next). En local, localhost funciona porque es el navegador del
  // propio desarrollador el que hace esa redirección, no un servidor.
  backendUrl: process.env.BACKEND_URL ?? `http://localhost:${Number(process.env.PORT ?? 8080)}`,
  jwtAccessSecret: requiredSecret("JWT_ACCESS_SECRET", 32, "dev-access-secret-cambiar-en-produccion"),
  jwtAccessTtlMinutes: Number(process.env.JWT_ACCESS_TTL_MINUTES ?? 15),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  emailVerificationTtlHours: Number(process.env.EMAIL_VERIFICATION_TTL_HOURS ?? 24),
  passwordResetTtlHours: Number(process.env.PASSWORD_RESET_TTL_HOURS ?? 1),
  cookieSecure: (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === "production" ? "true" : "false")) === "true",

  // SEG-02: secreto compartido con el proxy de Next (frontend/src/app/api/
  // [...path]/route.ts) para confiar en el header con la IP real del
  // cliente. Vacío = el backend ignora ese header y usa req.ip (hoy la IP
  // interna del proxy, compartida por todos — igual que antes de este
  // cambio, nunca peor).
  internalProxySecret: process.env.INTERNAL_PROXY_SECRET ?? "",

  // Módulo 06 — Checkout. Minutos que dura la reserva de stock de una orden
  // en `pendiente_pago` antes de liberarse sola. Configurable por variable
  // de entorno para poder "acelerar" la expiración en staging sin tocar
  // código (checklist del módulo 06).
  stockReservationTtlMinutes: Number(process.env.STOCK_RESERVATION_TTL_MINUTES ?? 60),
  // Cada cuánto corre el barrido que libera reservas expiradas.
  stockReservationSweepIntervalMs: Number(process.env.STOCK_RESERVATION_SWEEP_INTERVAL_MS ?? 30_000),

  // Módulo 07 — pagos (CyberSource/VisaNet, Secure Acceptance Hosted
  // Checkout — el método que Neonet pidió instalar). Vacías a propósito:
  // mientras `pagos_en_linea_habilitado` (paymentConfig.service.ts) esté en
  // false nada las lee. Cuando esté en true, cybersourceAdapter.ts es quien
  // exige que no estén vacías (no aquí, para no romper el arranque en
  // entornos donde el pago sigue apagado). Nunca hardcodear un valor de
  // respaldo real — solo strings vacíos.
  cybersourceEnv: process.env.CYBERSOURCE_ENV ?? "sandbox",
  cybersourceProfileId: process.env.CYBERSOURCE_PROFILE_ID ?? "",
  cybersourceAccessKey: process.env.CYBERSOURCE_ACCESS_KEY ?? "",
  // El Secret Key de Secure Acceptance firma tanto el formulario saliente
  // como la respuesta entrante (reply/IPN) — a diferencia de la API REST
  // v2, aquí no hay un secreto de webhook separado.
  cybersourceSecretKey: process.env.CYBERSOURCE_SECRET_KEY ?? "",

  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "no-responder@eltesoro.gt",
  emailFromName: process.env.EMAIL_FROM_NAME ?? "Almacén El Tesoro",

  // Módulo 08 — Panel admin: mismo bucket que usa el importador de Excel
  // (scripts/import-catalog.ts) para las fotos de producto — un solo lugar
  // de almacenamiento sin importar si la foto entró por importación o por
  // el panel.
  productImagesBucket: process.env.PRODUCT_IMAGES_BUCKET ?? "eltesoro-product-images-staging",
};
