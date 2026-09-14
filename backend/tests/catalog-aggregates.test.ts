import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./helpers/db";

// NUEVO-01: products.precioDesde/disponible ya no las mantiene el
// importador a mano — un trigger de Postgres las recalcula en cuanto cambia
// precio/activo de una variante o cantidadDisponible/cantidadReservada de
// su inventario (migración 20260914090000_nuevo01_trigger_agregados_producto).
// Estas pruebas ejercitan el trigger directo contra Postgres, sin pasar por
// ningún service — es infraestructura de base de datos, no lógica de
// aplicación.

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

async function createProductWithVariant(opts: { precio: string; cantidadDisponible: number }) {
  const category = await prisma.category.create({ data: { slug: `cat-${Date.now()}-${Math.random()}`, nombre: "Cat" } });
  const product = await prisma.product.create({
    data: { slug: `prod-${Date.now()}-${Math.random()}`, nombre: "Producto", estado: "activo", categoriaId: category.id },
  });
  const variant = await prisma.productVariant.create({
    data: { sku: `SKU-${Date.now()}-${Math.random()}`, precio: opts.precio, productId: product.id },
  });
  await prisma.inventory.create({ data: { variantId: variant.id, cantidadDisponible: opts.cantidadDisponible } });
  return { product, variant };
}

describe("Trigger de agregados de producto (NUEVO-01)", () => {
  it("crear variante + inventario deja precioDesde/disponible correctos sin que la app los escriba", async () => {
    const { product } = await createProductWithVariant({ precio: "150.00", cantidadDisponible: 3 });

    const refreshed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    // .toFixed(2), no .toString(): decimal.js recorta ceros de cola.
    expect(refreshed.precioDesde?.toFixed(2)).toBe("150.00");
    expect(refreshed.disponible).toBe(true);
  });

  it("bajar el stock a cero (ej. una reserva del checkout) apaga `disponible` sin tocar el importador", async () => {
    const { product, variant } = await createProductWithVariant({ precio: "150.00", cantidadDisponible: 2 });

    await prisma.inventory.update({ where: { variantId: variant.id }, data: { cantidadDisponible: 0 } });

    const refreshed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshed.disponible).toBe(false);
  });

  it("NUEVO-02: reservar todo el stock disponible (cantidadReservada) también apaga `disponible`", async () => {
    const { product, variant } = await createProductWithVariant({ precio: "150.00", cantidadDisponible: 5 });

    await prisma.inventory.update({ where: { variantId: variant.id }, data: { cantidadReservada: 5 } });

    const refreshed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshed.disponible).toBe(false);
  });

  it("desactivar la única variante activa limpia precioDesde a null y disponible a false", async () => {
    const { product, variant } = await createProductWithVariant({ precio: "150.00", cantidadDisponible: 5 });

    await prisma.productVariant.update({ where: { id: variant.id }, data: { activo: false } });

    const refreshed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshed.precioDesde).toBeNull();
    expect(refreshed.disponible).toBe(false);
  });

  it("con dos variantes, precioDesde toma la más barata entre las activas", async () => {
    const category = await prisma.category.create({ data: { slug: `cat-${Date.now()}-a`, nombre: "Cat" } });
    const product = await prisma.product.create({
      data: { slug: `prod-${Date.now()}-a`, nombre: "Producto", estado: "activo", categoriaId: category.id },
    });
    const caraId = (
      await prisma.productVariant.create({ data: { sku: `SKU-${Date.now()}-cara`, precio: "300.00", productId: product.id } })
    ).id;
    await prisma.inventory.create({ data: { variantId: caraId, cantidadDisponible: 1 } });

    const baratita = await prisma.productVariant.create({
      data: { sku: `SKU-${Date.now()}-barata`, precio: "99.50", productId: product.id },
    });
    await prisma.inventory.create({ data: { variantId: baratita.id, cantidadDisponible: 1 } });

    const refreshed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(refreshed.precioDesde?.toFixed(2)).toBe("99.50");
  });
});
