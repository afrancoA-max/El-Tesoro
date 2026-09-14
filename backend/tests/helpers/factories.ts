import { prisma } from "../../src/config/prisma";

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
  const product = await prisma.product.create({
    data: { slug: unique("prod"), nombre: "Producto de prueba", estado: "activo", categoriaId: category.id },
  });
  const variant = await prisma.productVariant.create({
    data: { sku: unique("SKU"), precio: opts.precio ?? "100.00", productId: product.id },
  });
  await prisma.inventory.create({
    data: { variantId: variant.id, cantidadDisponible: opts.stock, cantidadReservada: opts.cantidadReservada ?? 0 },
  });
  return { ...variant, categorySlug: category.slug, productSlug: product.slug };
}
