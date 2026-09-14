import { OrderView, ShippingMethodOption, ShippingMethodCode, CheckoutConfig } from "@el-tesoro/shared";
import { apiRequest } from "./httpClient";

const request = apiRequest;

// Interruptor "solo cotizar" mientras el negocio no tenga credenciales de
// Neonet (ver paymentConfig.service.ts en el backend). Mientras esté
// deshabilitado, el checkout no debe fallar si esta consulta falla — mejor
// asumir "solo cotizar" (el estado real de hoy) que arriesgar mostrar
// "Pagar" sin pasarela configurada.
export function fetchCheckoutConfig() {
  return request<CheckoutConfig>("/checkout/config");
}

export function fetchShippingMethods(departamento: string | null, subtotal: string) {
  const params = new URLSearchParams({ subtotal });
  if (departamento) params.set("departamento", departamento);
  return request<{ items: ShippingMethodOption[] }>(`/checkout/shipping-methods?${params.toString()}`);
}

export interface CreateOrderAddressInput {
  nombreDestinatario: string;
  telefono: string;
  departamento: string;
  municipio: string;
  direccion: string;
  referencia?: string;
}

export interface CreateOrderInput {
  addressId?: string;
  direccion?: CreateOrderAddressInput;
  contacto?: { email: string; telefono: string };
  facturacion: { nit: string; nombre: string };
  metodoEnvioCodigo: ShippingMethodCode;
}

export function createOrder(input: CreateOrderInput) {
  return request<{ order: OrderView }>("/orders", { method: "POST", body: JSON.stringify(input) });
}

export function fetchOrder(numero: string, token?: string) {
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return request<{ order: OrderView }>(`/orders/${numero}${qs}`);
}
