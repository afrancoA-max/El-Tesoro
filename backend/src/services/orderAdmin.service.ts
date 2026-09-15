import { OrderStatus, Prisma } from "@prisma/client";
import type { AdminOrderDetailView, AdminOrderSummaryView, OrderAddressSnapshot, ShippingMethodCode } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";
import { markOrderAsPaid } from "./order.service";
import { sendOrderShippedEmail } from "./email.service";

const adminOrderInclude = {
  user: true,
  items: true,
  statusHistory: { include: { adminUser: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

type AdminOrderRow = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

function clienteNombre(order: AdminOrderRow): string {
  return order.user?.nombre ?? order.facturacionNombre;
}

function clienteEmail(order: AdminOrderRow): string | null {
  return order.user?.email ?? order.invitadoEmail;
}

function toSummary(order: AdminOrderRow): AdminOrderSummaryView {
  return {
    id: order.id,
    numero: order.numero,
    estado: order.estado,
    clienteNombre: clienteNombre(order),
    clienteEmail: clienteEmail(order),
    total: order.total.toFixed(2),
    createdAt: order.createdAt.toISOString(),
    pagadoEn: order.pagadoEn ? order.pagadoEn.toISOString() : null,
  };
}

function toDetail(order: AdminOrderRow): AdminOrderDetailView {
  return {
    ...toSummary(order),
    facturacionNit: order.facturacionNit,
    facturacionNombre: order.facturacionNombre,
    metodoEnvioCodigo: order.metodoEnvioCodigo as ShippingMethodCode,
    metodoEnvioNombre: order.metodoEnvioNombre,
    direccionEnvio: (order.direccionEnvio as unknown as OrderAddressSnapshot | null) ?? null,
    guiaEnvio: order.guiaEnvio,
    motivoCancelacion: order.motivoCancelacion,
    items: order.items.map((item) => ({
      id: item.id,
      nombreProducto: item.nombreProducto,
      sku: item.sku,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
    })),
    historial: order.statusHistory.map((h) => ({
      id: h.id,
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      motivo: h.motivo,
      adminNombre: h.adminUser?.nombre ?? null,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

export interface OrderAdminListFilters {
  estado?: OrderStatus;
  desde?: Date;
  hasta?: Date;
  q?: string;
}

export async function listOrdersAdmin(
  filters: OrderAdminListFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<AdminOrderSummaryView>> {
  const where: Prisma.OrderWhereInput = {
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.desde || filters.hasta
      ? { createdAt: { ...(filters.desde ? { gte: filters.desde } : {}), ...(filters.hasta ? { lte: filters.hasta } : {}) } }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { numero: { contains: filters.q, mode: "insensitive" } },
            { invitadoEmail: { contains: filters.q, mode: "insensitive" } },
            { facturacionNombre: { contains: filters.q, mode: "insensitive" } },
            { user: { is: { email: { contains: filters.q, mode: "insensitive" } } } },
            { user: { is: { nombre: { contains: filters.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, include: adminOrderInclude, orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.limit }),
    prisma.order.count({ where }),
  ]);

  return buildPaginatedResult(orders.map(toSummary), total, pagination);
}

async function findOrderAdminOr404(id: string): Promise<AdminOrderRow> {
  const order = await prisma.order.findUnique({ where: { id }, include: adminOrderInclude });
  if (!order) throw AppError.notFound("ORDER_NOT_FOUND", "No existe ese pedido.");
  return order;
}

export async function getOrderAdminDetail(id: string): Promise<AdminOrderDetailView> {
  return toDetail(await findOrderAdminOr404(id));
}

/// servicio_cliente/admin: confirma manualmente un pago que no llegó por el
/// webhook de CyberSource (ej. transferencia bancaria, o el webhook falló).
/// Reusa `markOrderAsPaid` (mismo descuento de stock/correo/FEL/idempotencia
/// que el webhook) para no duplicar esa lógica — ver order.service.ts.
export async function confirmPaymentManually(orderId: string, adminUserId: string): Promise<AdminOrderDetailView> {
  const order = await findOrderAdminOr404(orderId);
  if (order.estado !== "pendiente_pago") {
    throw AppError.conflict("INVALID_TRANSITION", `No se puede confirmar el pago: el pedido está en estado '${order.estado}'.`);
  }
  await markOrderAsPaid(orderId, `manual:${adminUserId}:${Date.now()}`, adminUserId);
  return getOrderAdminDetail(orderId);
}

// Listo cuando (Módulo 08, punto 4): "Un pedido de prueba pagado puede
// avanzarse hasta `delivered`... el historial de estados del pedido queda
// visible." Solo se permite avanzar un paso a la vez, en el orden exacto
// del ciclo operativo — nunca saltar de `pagado` a `entregado` directo, para
// que el historial sea representativo de lo que de verdad pasó con el
// pedido físico.
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pagado: "en_preparacion",
  en_preparacion: "enviado",
  enviado: "entregado",
};

export async function advanceOrderStatus(
  orderId: string,
  adminUserId: string,
  opts: { guiaEnvio?: string } = {},
): Promise<AdminOrderDetailView> {
  const order = await findOrderAdminOr404(orderId);
  const next = NEXT_STATUS[order.estado];
  if (!next) {
    throw AppError.conflict("INVALID_TRANSITION", `El pedido en estado '${order.estado}' no se puede avanzar.`);
  }
  if (next === "enviado" && !opts.guiaEnvio?.trim()) {
    throw AppError.badRequest("GUIA_REQUIRED", "Indica el número de guía del transportista para marcar el pedido como enviado.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { estado: next, ...(next === "enviado" ? { guiaEnvio: opts.guiaEnvio!.trim() } : {}) },
    });
    await tx.orderStatusHistory.create({
      data: { orderId, estadoAnterior: order.estado, estadoNuevo: next, adminUserId },
    });
  });

  if (next === "enviado") {
    const destino = order.user?.email ?? order.invitadoEmail;
    if (destino) {
      try {
        await sendOrderShippedEmail(destino, clienteNombre(order), order.numero, opts.guiaEnvio!.trim());
      } catch (error) {
        logger.error({ err: error, orderId }, "No se pudo enviar el correo de envío.");
      }
    }
  }

  logger.info({ orderId, numero: order.numero, de: order.estado, a: next, adminUserId }, "Pedido avanzado desde el panel admin.");
  return getOrderAdminDetail(orderId);
}

// Cancelable hasta `en_preparacion` (antes de que el transportista se lo
// lleve) — una vez `enviado`, la única vía es la política de devoluciones,
// fuera de alcance de este módulo (ver docs/plan/08 sección 6).
const CANCELABLE_STATES: OrderStatus[] = ["pendiente_pago", "pagado", "en_preparacion"];

export async function cancelOrder(orderId: string, motivo: string, adminUserId: string): Promise<AdminOrderDetailView> {
  const order = await findOrderAdminOr404(orderId);
  if (!CANCELABLE_STATES.includes(order.estado)) {
    throw AppError.conflict("INVALID_TRANSITION", `Un pedido en estado '${order.estado}' ya no se puede cancelar desde el panel.`);
  }

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (!item.variantId) continue;
      if (order.estado === "pendiente_pago") {
        // Solo reservado, nunca descontado de verdad — libera la reserva.
        await tx.$executeRaw`
          UPDATE inventory SET "cantidadReservada" = GREATEST("cantidadReservada" - ${item.cantidad}, 0)
          WHERE "variantId" = ${item.variantId}
        `;
      } else {
        // Ya se había descontado de verdad al pagar (markOrderAsPaid) — hay
        // que devolverlo al stock vendible.
        await tx.$executeRaw`
          UPDATE inventory SET "cantidadDisponible" = "cantidadDisponible" + ${item.cantidad}
          WHERE "variantId" = ${item.variantId}
        `;
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { estado: "cancelado", motivoCancelacion: motivo, reservaLiberada: true, fechaExpiracionReserva: null },
    });
    await tx.orderStatusHistory.create({
      data: { orderId, estadoAnterior: order.estado, estadoNuevo: "cancelado", motivo, adminUserId },
    });
  });

  logger.info({ orderId, numero: order.numero, motivo, adminUserId }, "Pedido cancelado desde el panel admin.");
  return getOrderAdminDetail(orderId);
}
