import { createHmac, timingSafeEqual } from "node:crypto";

/// Firma de campos de CyberSource Secure Acceptance (Hosted Checkout /
/// Checkout API) — mecanismo distinto al de la API REST v2: aquí se firma
/// una lista de pares `nombre=valor` con HMAC-SHA256, usando el Secret Key
/// como bytes UTF-8 literales (nunca decodificado de base64 — a diferencia
/// de la API REST v2, que si usa el secreto como base64). Referencia:
/// https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-checkout/secure-acceptance.html
///
/// Se usa tanto para firmar el formulario saliente (el navegador lo manda a
/// la página hospedada de CyberSource) como para verificar la respuesta
/// firmada que CyberSource devuelve (reply / IPN) — misma función de
/// firma, distintos campos.
export function signFields(fields: Record<string, string>, signedFieldNames: string[], secretKey: string): string {
  const dataToSign = signedFieldNames.map((name) => `${name}=${fields[name] ?? ""}`).join(",");
  return createHmac("sha256", Buffer.from(secretKey, "utf8")).update(dataToSign, "utf8").digest("base64");
}

/// Verifica la firma de una respuesta de Secure Acceptance (reply del
/// navegador tras el pago, o IPN servidor-a-servidor — mismo formato en
/// ambos). `fields.signed_field_names` es la lista, en el orden exacto,
/// que CyberSource dice haber firmado — se recalcula la firma sobre esos
/// mismos campos y se compara contra `fields.signature`.
export function verifyReplySignature(fields: Record<string, string>, secretKey: string): boolean {
  const signedFieldNames = fields.signed_field_names;
  const signature = fields.signature;
  if (!signedFieldNames || !signature) return false;

  const expected = signFields(fields, signedFieldNames.split(","), secretKey);
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signature);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}
