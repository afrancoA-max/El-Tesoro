import { apiRequest } from "./httpClient";

const request = apiRequest;

export interface HostedCheckoutForm {
  postUrl: string;
  fields: Record<string, string>;
}

/// Módulo 07 — pagos (CyberSource Secure Acceptance Hosted Checkout). Pide
/// el formulario ya firmado por el backend para una orden — el frontend
/// solo lo renderiza como inputs ocultos y lo envía por POST directo al
/// navegador hacia la página hospedada de CyberSource; la tarjeta nunca
/// pasa por nuestro servidor ni por este código.
export function getHostedCheckoutForm(numero: string, token?: string) {
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return request<HostedCheckoutForm>(`/payments/orders/${numero}/hosted-checkout-form${qs}`);
}
