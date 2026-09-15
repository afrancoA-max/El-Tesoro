import { env } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";

/// Único punto de contacto con el proveedor de correo transaccional
/// (Brevo). Si el negocio cambia de proveedor más adelante, solo este
/// archivo se reescribe — el resto del código llama estas funciones, nunca
/// la API de Brevo directamente.
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
  if (!env.brevoApiKey) {
    logger.warn({ to, subject }, "BREVO_API_KEY no configurada: correo no enviado (solo se registra).");
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "api-key": env.brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: env.emailFromName, email: env.emailFrom },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  }).catch((error) => {
    logger.error({ err: error, to }, "No se pudo contactar al proveedor de correo.");
    throw AppError.badRequest("EMAIL_SEND_FAILED", "No se pudo enviar el correo. Intenta de nuevo.");
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error({ status: response.status, body, to }, "El proveedor de correo respondió con error.");
    throw AppError.badRequest("EMAIL_SEND_FAILED", "No se pudo enviar el correo. Intenta de nuevo.");
  }
}

export async function sendVerificationEmail(to: string, nombre: string, verifyUrl: string): Promise<void> {
  await sendEmail(
    to,
    "Confirma tu correo — Almacén El Tesoro",
    `<p>Hola ${escapeHtml(nombre)},</p>
     <p>Gracias por crear tu cuenta en Almacén El Tesoro. Confirma tu correo para activarla:</p>
     <p><a href="${verifyUrl}">Confirmar mi correo</a></p>
     <p>Este enlace expira en ${env.emailVerificationTtlHours} horas. Si no creaste esta cuenta, ignora este mensaje.</p>`,
  );
}

export async function sendPasswordResetEmail(to: string, nombre: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    "Recupera tu contraseña — Almacén El Tesoro",
    `<p>Hola ${escapeHtml(nombre)},</p>
     <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic para crear una nueva:</p>
     <p><a href="${resetUrl}">Restablecer mi contraseña</a></p>
     <p>Este enlace es de un solo uso y expira en ${env.passwordResetTtlHours} hora(s). Si no fuiste tú, ignora este mensaje.</p>`,
  );
}

/// Módulo 07 — pagos: correo de confirmación al pagarse la orden (webhook
/// de CyberSource, ver order.service.ts `markOrderAsPaid`). `total` ya
/// viene formateado como texto decimal fijo (CAR-05) — nunca number.
export async function sendOrderConfirmationEmail(to: string, nombre: string, numeroOrden: string, total: string): Promise<void> {
  await sendEmail(
    to,
    `Pedido confirmado ${numeroOrden} — Almacén El Tesoro`,
    `<p>Hola ${escapeHtml(nombre)},</p>
     <p>Tu pago fue confirmado y tu pedido <strong>${escapeHtml(numeroOrden)}</strong> por Q${escapeHtml(total)} ya está en preparación.</p>
     <p>Puedes ver el detalle y el estado de tu pedido en "Mis pedidos" dentro de tu cuenta.</p>`,
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
