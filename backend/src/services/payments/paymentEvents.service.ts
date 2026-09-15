import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { markOrderAsPaid, markOrderPaymentFailed } from "../order.service";

const DECISIONES_APROBADAS = new Set(["ACCEPT"]);
const DECISIONES_RECHAZADAS = new Set(["DECLINE", "ERROR", "CANCEL"]);

/// Procesa una respuesta firmada de Secure Acceptance (el reply que trae el
/// navegador de vuelta a nuestra página de recibo, o el IPN servidor-a-
/// servidor — mismo formato de campos en ambos). La firma ya se verificó
/// antes de llamar esto (ver payments.controller.ts); nunca se procesa un
/// payload sin firma verificada.
///
/// Idempotente por `req_transaction_uuid` (el `transaction_uuid` que
/// nosotros generamos al armar el formulario, que CyberSource siempre
/// devuelve con el prefijo `req_` — a diferencia de `transaction_id`, que
/// puede faltar en un ERROR): reintentar el mismo reply/IPN nunca vuelve a
/// descontar stock, reenviar correo o reintentar FEL (skill retail-
/// payments-integration, sección 5).
export async function procesarRespuestaCyberSource(fields: Record<string, string>): Promise<void> {
  const eventId = fields.req_transaction_uuid;
  const decision = fields.decision;
  const numero = fields.req_reference_number;

  if (!eventId || !numero) {
    logger.error({ fields }, "Respuesta de CyberSource sin transaction_uuid o sin número de orden; se descarta.");
    return;
  }

  const order = await prisma.order.findUnique({ where: { numero } });
  if (!order) {
    logger.error({ eventId, numero }, "Respuesta de CyberSource para una orden que no existe.");
    return;
  }

  let procesadoOk = true;
  let error: string | undefined;

  try {
    await prisma.paymentEvent.create({
      data: {
        orderId: order.id,
        proveedor: "cybersource",
        eventId,
        tipo: decision ?? "desconocido",
        payload: fields as object,
        procesadoOk: true,
      },
    });
  } catch (createError) {
    const isDuplicate = (createError as { code?: string }).code === "P2002";
    if (isDuplicate) {
      logger.info({ eventId, numero }, "Respuesta de CyberSource duplicada; ya se había procesado (idempotencia).");
      return;
    }
    throw createError;
  }

  try {
    if (decision && DECISIONES_APROBADAS.has(decision) && fields.transaction_id) {
      await markOrderAsPaid(order.id, fields.transaction_id);
    } else if (decision && DECISIONES_RECHAZADAS.has(decision)) {
      await markOrderPaymentFailed(order.id, fields.message ?? `Pago rechazado (${decision}).`);
    } else {
      logger.info({ eventId, numero, decision }, "Respuesta de CyberSource sin acción de estado definida; solo se registra.");
    }
  } catch (processError) {
    procesadoOk = false;
    error = processError instanceof Error ? processError.message : String(processError);
    logger.error({ err: processError, eventId, numero }, "Error procesando respuesta de CyberSource.");
  }

  if (!procesadoOk) {
    await prisma.paymentEvent.update({ where: { proveedor_eventId: { proveedor: "cybersource", eventId } }, data: { procesadoOk, error } });
  }
}
