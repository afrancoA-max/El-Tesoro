import { prisma } from "../../src/config/prisma";
import { normalizeText } from "../../src/utils/normalizeText";

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
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
