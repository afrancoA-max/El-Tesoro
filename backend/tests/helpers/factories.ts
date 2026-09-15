import type { Role } from "@el-tesoro/shared";
import { prisma } from "../../src/config/prisma";
import { normalizeText } from "../../src/utils/normalizeText";

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/** Usuario interno (admin/staff/operador/servicio_cliente) para pruebas del
 * panel admin (Módulo 08) — `passwordHash` es un valor cualquiera, las
 * pruebas autentican firmando el JWT directo (ver signAccessToken), nunca
 * hacen login real. */
export async function createInternalUser(role: Role, nombre = "Personal de prueba") {
  return prisma.user.create({
    data: { email: unique("interno") + "@eltesoro.gt", nombre, passwordHash: "x", role, emailVerifiedAt: new Date() },
  });
}

/** Orden ya pagada con una línea, para probar el ciclo operativo del panel
 * admin (avanzar estado, cancelar, reportes de ventas) sin pasar por todo
 * el flujo de checkout — ese flujo ya tiene su propia cobertura en
 * checkout.test.ts/payments.test.ts. */
export async function createPaidOrder(opts: { total?: string; pagadoEn?: Date; variantId?: string; cantidad?: number } = {}) {
  const variant = opts.variantId ? null : await createSellableVariant({ stock: 20 });
  const variantId = opts.variantId ?? variant!.id;
  const total = opts.total ?? "150.00";
  const cantidad = opts.cantidad ?? 1;

  return prisma.order.create({
    data: {
      numero: unique("AET"),
      estado: "pagado",
      facturacionNit: "CF",
      facturacionNombre: "Cliente de prueba",
      invitadoEmail: "cliente@example.com",
      metodoEnvioCodigo: "recoger_tienda",
      metodoEnvioNombre: "Recoger en tienda",
      subtotal: total,
      costoEnvio: "0.00",
      total,
      ivaIncluidoInformativo: "0.00",
      pagadoEn: opts.pagadoEn ?? new Date(),
      items: {
        create: [{ variantId, nombreProducto: "Producto de prueba", sku: unique("SKU"), cantidad, precioUnitario: total, subtotal: total }],
      },
    },
    include: { items: true },
  });
}

/** Producto activo con una sola variante vendible y su inventario. */
export async function createSellableVariant(opts: { stock: number; precio?: string; cantidadReservada?: number }) {
  const category = await prisma.category.create({
    data: { slug: unique("cat"), nombre: "Categoría de prueba" },
  });
  const nombre = "Producto de prueba";
  const product = await prisma.product.create({
    // `busqueda` no se pone sola (la mantiene import-catalog.ts en real, ver
    // Product.busqueda en schema.prisma) — sin esto, search.service.ts nunca
    // encuentra productos creados por esta factory.
    data: { slug: unique("prod"), nombre, estado: "activo", categoriaId: category.id, busqueda: normalizeText(nombre) },
  });
  const variant = await prisma.productVariant.create({
    data: { sku: unique("SKU"), precio: opts.precio ?? "100.00", productId: product.id },
  });
  await prisma.inventory.create({
    data: { variantId: variant.id, cantidadDisponible: opts.stock, cantidadReservada: opts.cantidadReservada ?? 0 },
  });
  return { ...variant, categorySlug: category.slug, productSlug: product.slug };
}
