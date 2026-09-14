import { Prisma } from "@prisma/client";
import type { OrderAddressSnapshot, OrderSummaryView, OrderView, ShippingMethodCode } from "@el-tesoro/shared";
import { fromCents, multiplyMoney, sumMoney, toCents } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { generateOpaqueToken, hashOpaqueToken } from "../utils/tokens";
import { nextOrderNumber } from "../utils/orderNumber";
import { logger } from "../config/logger";
import { getCartForCheckout } from "./cart.service";
import type { CartContext } from "./cart.service";
import * as addressesService from "./addresses.service";
import { resolveShippingCost } from "./shipping.service";
import type { CreateOrderInput } from "../validators/checkout.validator";

const orderWithItems = Prisma.validator<Prisma.OrderDefaultArgs>()({ include: { items: true } });
type OrderWithItems = Prisma.OrderGetPayload<typeof orderWithItems>;

function toOrderView(order: OrderWithItems, accessToken?: string): OrderView {
  return {
    id: order.id,
    numero: order.numero,
    estado: order.estado,
    createdAt: order.createdAt.toISOString(),
    invitadoEmail: order.invitadoEmail,
    invitadoTelefono: order.invitadoTelefono,
    facturacionNit: order.facturacionNit,
    facturacionNombre: order.facturacionNombre,
    metodoEnvioCodigo: order.metodoEnvioCodigo as ShippingMethodCode,
    metodoEnvioNombre: order.metodoEnvioNombre,
    direccionEnvio: (order.direccionEnvio as unknown as OrderAddressSnapshot | null) ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      nombreProducto: item.nombreProducto,
      sku: item.sku,
      imagenUrl: item.imagenUrl,
      atributos: (item.atributos as unknown as { tipo: string; valor: string }[] | null) ?? [],
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
    })),
    subtotal: order.subtotal.toFixed(2),
    costoEnvio: order.costoEnvio.toFixed(2),
    descuento: order.descuento.toFixed(2),
    total: order.total.toFixed(2),
    ivaIncluidoInformativo: order.ivaIncluidoInformativo.toFixed(2),
    fechaExpiracionReserva: order.fechaExpiracionReserva ? order.fechaExpiracionReserva.toISOString() : null,
    ...(accessToken ? { accessToken } : {}),
  };
}

// IVA (12%, Guatemala) ya incluido en cada precio (CAR-05/06-checkout
// sección 2) — este cálculo es solo el desglose informativo del recibo,
// nunca se suma al total.
function computeIvaIncluido(subtotal: string): string {
  const subtotalCents = toCents(subtotal);
  const baseCents = Math.round(subtotalCents / 1.12);
  return fromCents(subtotalCents - baseCents);
}

export async function createOrder(ctx: CartContext, authUserId: string | undefined, input: CreateOrderInput): Promise<OrderView> {
  const cart = await getCartForCheckout(ctx);
  if (!cart || cart.items.length === 0) {
    throw AppError.badRequest("EMPTY_CART", "Tu carrito está vacío.");
  }

  const noDisponibles = cart.items.filter((item) => !item.disponible);
  if (noDisponibles.length > 0) {
    throw AppError.conflict(
      "ITEM_UNAVAILABLE",
      `"${noDisponibles[0].nombreProducto}" ya no está disponible. Elimínalo del carrito para continuar.`,
    );
  }

  // Skill retail-cart-checkout, sección 7, paso 4: si algún ítem ya no tiene
  // stock suficiente, el checkout se detiene aquí con el producto y la
  // cantidad disponible — nunca se recorta en silencio como sí hace el
  // carrito (Módulo 05).
  const sinStock = cart.items.filter((item) => item.cantidad > item.stockDisponible);
  if (sinStock.length > 0) {
    const detalle = sinStock.map((item) => `${item.nombreProducto} (disponible: ${item.stockDisponible})`).join("; ");
    throw AppError.conflict("INSUFFICIENT_STOCK", `Ya no hay stock suficiente para: ${detalle}. Ajusta las cantidades en tu carrito.`);
  }

  if (!authUserId && !input.contacto) {
    throw AppError.badRequest("CONTACT_REQUIRED", "Indica tu correo y teléfono para continuar como invitado.");
  }

  const esRecogerTienda = input.metodoEnvioCodigo === "recoger_tienda";
  let direccionSnapshot: OrderAddressSnapshot | null = null;

  if (!esRecogerTienda) {
    if (input.addressId) {
      if (!authUserId) {
        throw AppError.badRequest("ADDRESS_REQUIRES_ACCOUNT", "Inicia sesión para usar una dirección guardada.");
      }
      const address = await addressesService.getAddressForCheckout(authUserId, input.addressId);
      direccionSnapshot = {
        nombreDestinatario: address.nombreDestinatario,
        telefono: address.telefono,
        departamento: address.departamento,
        municipio: address.municipio,
        direccion: address.direccion,
        referencia: address.referencia,
      };
    } else if (input.direccion) {
      direccionSnapshot = { ...input.direccion, referencia: input.direccion.referencia ?? null };
    } else {
      throw AppError.badRequest("ADDRESS_REQUIRED", "Indica una dirección de envío o elige recoger en tienda.");
    }
  }

  const subtotal = sumMoney(cart.items.map((item) => multiplyMoney(item.precio, item.cantidad)));

  let shipping;
  try {
    shipping = await resolveShippingCost(input.metodoEnvioCodigo, direccionSnapshot?.departamento ?? null, subtotal);
  } catch (error) {
    throw AppError.badRequest("SHIPPING_UNAVAILABLE", error instanceof Error ? error.message : "Método de envío no disponible.");
  }

  const total = sumMoney([subtotal, shipping.costo]);
  const ivaIncluidoInformativo = computeIvaIncluido(subtotal);
  const { raw: accessTokenRaw, hash: accessTokenHash } = generateOpaqueToken();
  const fechaExpiracionReserva = new Date(Date.now() + env.stockReservationTtlMinutes * 60_000);

  const created = await prisma.$transaction(async (tx) => {
    // Reserva atómica por línea, condicionada al stock vendible real en la
    // misma sentencia — nunca leer y luego escribir por separado (docs/plan
    // 06-checkout.md sección 7.2): dos checkouts a la vez sobre la última
    // unidad nunca reservan ambos.
    for (const item of cart.items) {
      const affected = await tx.$executeRaw`
        UPDATE inventory
        SET "cantidadReservada" = "cantidadReservada" + ${item.cantidad}
        WHERE "variantId" = ${item.variantId}
          AND ("cantidadDisponible" - "cantidadReservada") >= ${item.cantidad}
      `;
      if (affected === 0) {
        throw AppError.conflict(
          "INSUFFICIENT_STOCK",
          `"${item.nombreProducto}" ya no tiene stock suficiente. Ajusta tu carrito e intenta de nuevo.`,
        );
      }
    }

    const numero = await nextOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        numero,
        userId: authUserId ?? null,
        invitadoEmail: authUserId ? null : (input.contacto?.email ?? null),
        invitadoTelefono: authUserId ? null : (input.contacto?.telefono ?? null),
        facturacionNit: input.facturacion.nit,
        facturacionNombre: input.facturacion.nombre,
        metodoEnvioCodigo: shipping.codigo,
        metodoEnvioNombre: shipping.nombre,
        direccionEnvio: direccionSnapshot ? (direccionSnapshot as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        subtotal,
        costoEnvio: shipping.costo,
        total,
        ivaIncluidoInformativo,
        accessTokenHash,
        fechaExpiracionReserva,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            nombreProducto: item.nombreProducto,
            sku: item.sku,
            imagenUrl: item.imagen,
            atributos: item.atributos as unknown as Prisma.InputJsonValue,
            cantidad: item.cantidad,
            precioUnitario: item.precio,
            subtotal: multiplyMoney(item.precio, item.cantidad),
          })),
        },
      },
      include: { items: true },
    });

    // 06-checkout.md sección 7.1: vaciar y reutilizar el carrito — nunca
    // queda "convertido" de forma persistente, y @unique(userId) sigue
    // intacto.
    await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
    await tx.cart.update({ where: { id: cart.cartId }, data: { estado: "activo" } });

    return order;
  });

  logger.info({ orderId: created.id, numero: created.numero }, "Orden creada");

  // El accessToken solo tiene sentido para invitados (es su única forma de
  // volver a consultar el pedido); un usuario con sesión ya puede verlo por
  // ser el dueño (`userId`), así que no hace falta exponerlo.
  return toOrderView(created, authUserId ? undefined : accessTokenRaw);
}

async function findOrderOr404(where: Prisma.OrderWhereUniqueInput): Promise<OrderWithItems> {
  const order = await prisma.order.findUnique({ where, include: { items: true } });
  if (!order) throw AppError.notFound("ORDER_NOT_FOUND", "No existe ese pedido.");
  return order;
}

function assertCanView(order: OrderWithItems, opts: { userId?: string; rawToken?: string }): void {
  const ownedByUser = Boolean(opts.userId) && order.userId === opts.userId;
  const ownedByToken = !ownedByUser && Boolean(order.accessTokenHash) && Boolean(opts.rawToken) && order.accessTokenHash === hashOpaqueToken(opts.rawToken!);

  // Mismo criterio que direcciones/carrito: "no existe" y "no es tuyo"
  // responden igual (404), para no filtrar que un número de orden existe.
  if (!ownedByUser && !ownedByToken) {
    throw AppError.notFound("ORDER_NOT_FOUND", "No existe ese pedido.");
  }
}

export async function getOrderByNumero(numero: string, opts: { userId?: string; rawToken?: string }): Promise<OrderView> {
  const order = await findOrderOr404({ numero });
  assertCanView(order, opts);
  return toOrderView(order);
}

export async function listMyOrders(userId: string): Promise<{ items: OrderSummaryView[]; total: number }> {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: { select: { cantidad: true } } },
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return {
    items: orders.map((order) => ({
      id: order.id,
      numero: order.numero,
      estado: order.estado,
      createdAt: order.createdAt.toISOString(),
      total: order.total.toFixed(2),
      totalUnidades: order.items.reduce((sum, item) => sum + item.cantidad, 0),
    })),
    total,
  };
}

/// Barrido periódico (ver index.ts) que libera la reserva de stock de toda
/// orden en `pendiente_pago` cuya `fechaExpiracionReserva` ya pasó — docs/
/// plan/06-checkout.md, criterio "Una orden no pagada expira su reserva en
/// el tiempo configurado y el stock vuelve a estar disponible".
export async function releaseExpiredReservations(now: Date = new Date()): Promise<number> {
  const expired = await prisma.order.findMany({
    where: { estado: "pendiente_pago", reservaLiberada: false, fechaExpiracionReserva: { lt: now } },
    include: { items: true },
  });

  for (const order of expired) {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.$executeRaw`
          UPDATE inventory
          SET "cantidadReservada" = GREATEST("cantidadReservada" - ${item.cantidad}, 0)
          WHERE "variantId" = ${item.variantId}
        `;
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          estado: "cancelado",
          motivoCancelacion: "expirada_reserva",
          reservaLiberada: true,
          fechaExpiracionReserva: null,
        },
      });
    });
    logger.info({ orderId: order.id, numero: order.numero }, "Reserva de stock liberada por expiración");
  }

  return expired.length;
}
