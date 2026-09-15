import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { signFields, verifyReplySignature } from "./secureAcceptanceSigning";

type OrderForPayment = Prisma.OrderGetPayload<{ include: { items: true } }>;

export interface HostedCheckoutForm {
  /// URL de la página hospedada de CyberSource a la que el navegador
  /// manda el formulario (POST, redirección completa fuera del sitio).
  postUrl: string;
  /// Campos a renderizar como inputs ocultos, exactamente en este objeto —
  /// el frontend no decide ni agrega nada.
  fields: Record<string, string>;
}

function assertConfigured(): void {
  if (!env.cybersourceProfileId || !env.cybersourceAccessKey || !env.cybersourceSecretKey) {
    // Solo se exige aquí (no en env.ts) porque mientras
    // `pagos_en_linea_habilitado` esté en false nadie debería llegar a
    // llamar esto — ver paymentConfig.service.ts.
    throw AppError.badRequest("PAYMENTS_NOT_CONFIGURED", "La pasarela de pago no tiene credenciales configuradas todavía.");
  }
}

function hostedCheckoutUrl(): string {
  return env.cybersourceEnv === "production"
    ? "https://secureacceptance.cybersource.com/pay"
    : "https://testsecureacceptance.cybersource.com/pay";
}

/// Arma y firma el formulario que el navegador va a enviar a la página
/// hospedada de CyberSource (Secure Acceptance Hosted Checkout — el método
/// que Neonet pidió instalar, sin llamadas server-to-server para cobrar:
/// CyberSource captura la tarjeta en su propia página).
///
/// Firma TODOS los campos (`unsigned_field_names` vacío) — este perfil
/// específico (VisaNet Guatemala) rechazaba con "not authorized" cuando
/// solo se firmaba el subconjunto "core" y se dejaban sin firmar los de
/// facturación/retorno, aunque la firma en sí fuera válida sobre esos
/// campos. Confirmado contra una integración de referencia (Wix/Velo) que
/// sí procesa pagos en esta misma cuenta firmando el conjunto completo.
function buildHostedCheckoutForm(order: OrderForPayment, receiptUrl: string, cancelUrl: string, ipnUrl: string): HostedCheckoutForm {
  assertConfigured();

  const fields: Record<string, string> = {
    access_key: env.cybersourceAccessKey,
    profile_id: env.cybersourceProfileId,
    transaction_uuid: randomUUID(),
    signed_date_time: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    locale: "es",
    transaction_type: "sale",
    reference_number: order.numero,
    amount: order.total.toFixed(2),
    currency: "GTQ",
    // Sin campos sin firmar — ver nota arriba.
    unsigned_field_names: "",
    // POST servidor-a-servidor con el resultado (la fuente de verdad real,
    // ver payments.controller.ts `secureAcceptanceIpnController`) — se
    // manda por transacción porque el perfil no tiene un Merchant POST URL
    // configurado de forma fija (Notifications: Disabled en Business
    // Center).
    override_backoffice_post_url: ipnUrl,
    // A dónde vuelve el navegador del cliente después de pagar (solo UX;
    // ver payments.controller.ts sobre por qué el reply firmado aquí
    // también es confiable, no un simple redirect).
    override_custom_receipt_page: receiptUrl,
    override_custom_cancel_page: cancelUrl,
    bill_to_forename: order.facturacionNombre.split(" ")[0] || order.facturacionNombre,
    bill_to_surname: order.facturacionNombre.split(" ").slice(1).join(" ") || "-",
    bill_to_email: order.invitadoEmail ?? "cliente@eltesoro.gt",
    bill_to_address_line1: "N/D",
    bill_to_address_city: "Guatemala",
    bill_to_address_country: "GT",
    bill_to_address_postal_code: "01001",
  };

  // signed_field_names se arma al final, a partir de los campos que ya
  // existen en este punto — nunca al revés (ver la nota en
  // secureAcceptanceSigning.ts sobre por qué debe coincidir exactamente
  // con lo que se firma).
  const signedFieldNames = [...Object.keys(fields), "signed_field_names"];
  fields.signed_field_names = signedFieldNames.join(",");

  const signature = signFields(fields, signedFieldNames, env.cybersourceSecretKey);

  return { postUrl: hostedCheckoutUrl(), fields: { ...fields, signature } };
}

/// Verifica la firma de una respuesta de Secure Acceptance — se usa tanto
/// para el reply que el navegador trae de vuelta (POST-back a nuestra
/// página de recibo) como para el IPN servidor-a-servidor, mismo formato.
/// Una firma inválida nunca debe mover el estado de una orden.
function verifyReply(fields: Record<string, string>): boolean {
  if (!env.cybersourceSecretKey) return false;
  return verifyReplySignature(fields, env.cybersourceSecretKey);
}

export const cybersourceAdapter = {
  buildHostedCheckoutForm,
  verifyReply,
};
