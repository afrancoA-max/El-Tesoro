// Módulo 08 — Panel admin. Tipos de las respuestas de `/api/admin/*`,
// separados de shared/src/catalog.ts y order.ts (los tipos públicos) porque
// el admin necesita campos que el catálogo/pedido público nunca expone
// (costos internos de auditoría, historial, umbral de stock bajo editable).

import { Role } from "./auth";
import { OrderAddressSnapshot, OrderStatus, ShippingMethodCode } from "./order";

/// Roles asignables desde "Mantenimiento de usuarios" — nunca `customer` ni
/// `wholesale` (cuentas de cliente, se dan de alta desde /cuenta/registro o
/// el futuro portal mayorista, no desde aquí).
export const ASSIGNABLE_INTERNAL_ROLES: Extract<Role, "admin" | "staff" | "operador" | "servicio_cliente">[] = [
  "admin",
  "staff",
  "operador",
  "servicio_cliente",
];

export interface AdminUserView {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  activo: boolean;
  createdAt: string;
}

export interface AdminCategoryView {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  orden: number;
  parentId: string | null;
  productCount: number;
}

export interface AdminProductImageView {
  id: string;
  url: string;
  orden: number;
  textoAlternativo: string | null;
  variantId: string | null;
}

export interface AdminVariantView {
  id: string;
  sku: string;
  activo: boolean;
  precio: string;
  precioComparativo: string | null;
  cantidadDisponible: number;
  cantidadReservada: number;
  umbralStockBajo: number;
}

export interface AdminProductView {
  id: string;
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  descripcionLarga: string | null;
  marca: string | null;
  estado: "activo" | "borrador" | "descontinuado";
  categoriaId: string;
  categoriaNombre: string;
  externalSource: string | null;
  syncedAt: string | null;
  images: AdminProductImageView[];
  variants: AdminVariantView[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductSummaryView {
  id: string;
  slug: string;
  nombre: string;
  marca: string | null;
  estado: "activo" | "borrador" | "descontinuado";
  categoriaNombre: string;
  imagenPrincipal: string | null;
  variantCount: number;
  externalSource: string | null;
}

export interface InventoryAdjustmentReason {
  codigo: "recepcion" | "merma" | "correccion";
  etiqueta: string;
}

export const INVENTORY_ADJUSTMENT_REASONS: InventoryAdjustmentReason[] = [
  { codigo: "recepcion", etiqueta: "Recepción de mercadería" },
  { codigo: "merma", etiqueta: "Merma / daño" },
  { codigo: "correccion", etiqueta: "Corrección de conteo" },
];

export interface AdminInventoryItemView {
  variantId: string;
  sku: string;
  productoNombre: string;
  productoSlug: string;
  categoria: string;
  cantidadDisponible: number;
  cantidadReservada: number;
  umbralStockBajo: number;
  stockBajo: boolean;
}

export interface InventoryAdjustmentView {
  id: string;
  variantId: string;
  delta: number;
  motivo: string;
  cantidadResultante: number;
  adminNombre: string;
  createdAt: string;
}

export interface OrderStatusHistoryEntryView {
  id: string;
  estadoAnterior: OrderStatus | null;
  estadoNuevo: OrderStatus;
  motivo: string | null;
  adminNombre: string | null;
  createdAt: string;
}

export interface AdminOrderSummaryView {
  id: string;
  numero: string;
  estado: OrderStatus;
  clienteNombre: string;
  clienteEmail: string | null;
  total: string;
  createdAt: string;
  pagadoEn: string | null;
}

export interface AdminOrderDetailView extends AdminOrderSummaryView {
  facturacionNit: string;
  facturacionNombre: string;
  metodoEnvioCodigo: ShippingMethodCode;
  metodoEnvioNombre: string;
  direccionEnvio: OrderAddressSnapshot | null;
  guiaEnvio: string | null;
  motivoCancelacion: string | null;
  items: {
    id: string;
    nombreProducto: string;
    sku: string;
    cantidad: number;
    precioUnitario: string;
    subtotal: string;
  }[];
  historial: OrderStatusHistoryEntryView[];
}

export interface SalesReportRangeTotals {
  totalVentas: string;
  cantidadOrdenes: number;
  unidadesVendidas: number;
}

export interface SalesReportByDay {
  fecha: string;
  totalVentas: string;
  cantidadOrdenes: number;
}

export interface SalesReportTopProduct {
  productoNombre: string;
  sku: string;
  unidadesVendidas: number;
  totalVentas: string;
}

export interface SalesReportByCategory {
  categoriaNombre: string;
  totalVentas: string;
  unidadesVendidas: number;
}

export interface SalesReportView {
  desde: string;
  hasta: string;
  totales: SalesReportRangeTotals;
  porDia: SalesReportByDay[];
  productosTop: SalesReportTopProduct[];
  porCategoria: SalesReportByCategory[];
}

export interface CatalogImportSummaryView {
  filas: number;
  productosNuevos: number;
  productosActualizados: number;
  rechazadas: { fila: number; codigo: string; descripcion: string; motivo: string }[];
  advertencias: { fila: number; codigo: string; mensaje: string }[];
}
