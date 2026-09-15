import type { NextFunction, Request, Response } from "express";
import * as orderService from "../services/order.service";
import * as paymentConfigService from "../services/paymentConfig.service";
import { cybersourceAdapter } from "../services/payments/cybersourceAdapter";
import { procesarRespuestaCyberSource } from "../services/payments/paymentEvents.service";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import { logger } from "../config/logger";

/// Arma y firma el formulario de Secure Acceptance Hosted Checkout para
/// una orden — el frontend lo renderiza como inputs ocultos y lo envía por
/// POST directo al navegador (nunca pasa por nuestro backend ni por el
/// proxy de Next; el cliente sale del sitio hacia la página hospedada de
/// CyberSource, que es quien captura la tarjeta).
export async function getHostedCheckoutFormController(req: Request, res: Response, next: NextFunction) {
  try {
    const habilitado = await paymentConfigService.isOnlinePaymentEnabled();
    if (!habilitado) {
      throw AppError.badRequest("PAYMENTS_DISABLED", "El pago en línea no está habilitado todavía.");
    }

    const rawToken = typeof req.query.token === "string" ? req.query.token : undefined;
    const order = await orderService.getOrderEntityByNumero(req.params.numero, { userId: req.user?.id, rawToken });

    if (order.estado !== "pendiente_pago") {
      throw AppError.conflict("ORDER_NOT_PAYABLE", "Esta orden ya no está pendiente de pago.");
    }

    const tokenQs = rawToken ? `?token=${encodeURIComponent(rawToken)}` : "";
    const receiptUrl = `${env.backendUrl}/api/payments/secure-acceptance/receipt${tokenQs}`;
    const cancelUrl = `${env.frontendUrl}/checkout/confirmacion/${order.numero}${tokenQs}`;
    const ipnUrl = `${env.backendUrl}/api/payments/secure-acceptance/ipn`;

    const form = cybersourceAdapter.buildHostedCheckoutForm(order, receiptUrl, cancelUrl, ipnUrl);
    res.json({ success: true, data: form });
  } catch (error) {
    next(error);
  }
}

/// Redirige a la orden correspondiente en el frontend, preservando el
/// token de invitado si vino en la URL de vuelta.
function redirectToConfirmacion(res: Response, numero: string, token?: string) {
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  res.redirect(303, `${env.frontendUrl}/checkout/confirmacion/${numero}${qs}`);
}

/// POST-back que el navegador del cliente trae de vuelta desde la página
/// hospedada de CyberSource (`override_custom_receipt_page`). Viene firmado
/// por CyberSource con el mismo Secret Key — a diferencia de una
/// redirección común (que cualquiera podría fabricar con solo cambiar la
/// URL), este payload trae una firma HMAC que solo CyberSource puede
/// producir, así que **si la firma verifica, es una fuente tan confiable
/// como un IPN servidor-a-servidor** y sí se usa para confirmar el pago —
/// nunca se confirma nada aquí sin verificar la firma primero.
export async function secureAcceptanceReceiptController(req: Request, res: Response) {
  const fields = req.body as Record<string, string>;
  const numero = fields.req_reference_number;
  const token = typeof req.query.token === "string" ? req.query.token : undefined;

  if (!cybersourceAdapter.verifyReply(fields)) {
    logger.error({ numero }, "Reply de Secure Acceptance con firma inválida; se ignora (no confirma la orden).");
    if (numero) redirectToConfirmacion(res, numero, token);
    else res.redirect(303, env.frontendUrl);
    return;
  }

  try {
    await procesarRespuestaCyberSource(fields);
  } catch (error) {
    logger.error({ err: error }, "Error inesperado procesando el reply de Secure Acceptance.");
  }

  redirectToConfirmacion(res, numero, token);
}

/// IPN servidor-a-servidor (configurable en Business Center con una URL
/// pública) — mismo formato y misma verificación que el reply de arriba,
/// pero sin navegador de por medio. Es la fuente de verdad recomendada
/// cuando está configurada; el reply de arriba cubre el caso en que no lo
/// esté (ambos exigen firma verificada antes de tocar la orden).
export async function secureAcceptanceIpnController(req: Request, res: Response) {
  const fields = req.body as Record<string, string>;

  if (!cybersourceAdapter.verifyReply(fields)) {
    logger.error({ numero: fields.req_reference_number }, "IPN de Secure Acceptance con firma inválida; rechazado.");
    res.status(401).json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Firma inválida." } });
    return;
  }

  try {
    await procesarRespuestaCyberSource(fields);
  } catch (error) {
    logger.error({ err: error }, "Error inesperado procesando el IPN de Secure Acceptance.");
  }

  res.status(200).json({ success: true });
}
