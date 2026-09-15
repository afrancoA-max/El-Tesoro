export type OrderStatus = "pendiente_pago" | "pagado" | "en_preparacion" | "enviado" | "entregado" | "cancelado";

export type ShippingCarrier = "cargo_expreso" | "forza";

/// "recoger_tienda" no es un `ShippingCarrier` (no tiene tarifa por
/// departamento, ver shared/src/shipping.ts) — el código de método de envío
/// de una orden es más amplio que solo los transportistas.
export type ShippingMethodCode = ShippingCarrier | "recoger_tienda";

export interface OrderAddressSnapshot {
  nombreDestinatario: string;
  telefono: string;
  departamento: string;
  municipio: string;
  direccion: string;
  referencia: string | null;
}

export interface OrderItemView {
  id: string;
  variantId: string | null;
  nombreProducto: string;
  sku: string;
  imagenUrl: string | null;
  atributos: { tipo: string; valor: string }[];
  cantidad: number;
  // CAR-05: texto decimal fijo, igual que el resto de la API.
  precioUnitario: string;
  subtotal: string;
}

export interface OrderView {
  id: string;
  numero: string;
  estado: OrderStatus;
  createdAt: string;

  invitadoEmail: string | null;
  invitadoTelefono: string | null;

  facturacionNit: string;
  facturacionNombre: string;

  metodoEnvioCodigo: ShippingMethodCode;
  metodoEnvioNombre: string;
  direccionEnvio: OrderAddressSnapshot | null;

  items: OrderItemView[];

  subtotal: string;
  costoEnvio: string;
  descuento: string;
  total: string;
  ivaIncluidoInformativo: string;

  fechaExpiracionReserva: string | null;

  // Módulo 07 — pagos: motivo del último rechazo (si lo hay), para que el
  // checkout pueda ofrecer "vuelve a intentar" sin inventar texto genérico.
  pagoUltimoError: string | null;

  // Módulo 07 — FEL ("enchufe"): mientras no haya certificador conectado
  // queda en "pendiente" y `felPdfUrl` es siempre null.
  felEstado: FelStatus;
  felPdfUrl: string | null;

  // Solo presente en la respuesta de creación (POST /orders), para que un
  // invitado sin cuenta pueda volver a consultar su propia orden. Nunca se
  // devuelve en listados ni en GET posteriores.
  accessToken?: string;
}

export type FelStatus = "pendiente" | "emitida" | "fallida";

export interface OrderSummaryView {
  id: string;
  numero: string;
  estado: OrderStatus;
  createdAt: string;
  total: string;
  totalUnidades: number;
}

/// Interruptor de pago en línea (Neonet) — mientras esté en `false` el
/// checkout muestra "Cotizar" en vez de "Pagar" y no intenta cobrar (no hay
/// credenciales todavía). Ver paymentConfig.service.ts en el backend.
export interface CheckoutConfig {
  pagosEnLineaHabilitado: boolean;
}

export interface ShippingMethodOption {
  codigo: ShippingMethodCode;
  nombre: string;
  costo: string;
  gratisPorMonto: boolean;
  disponible: boolean;
  /// Motivo cuando `disponible` es `false` (ej. "Sin cobertura de Cargo Expreso en este departamento.").
  motivoNoDisponible: string | null;
}
