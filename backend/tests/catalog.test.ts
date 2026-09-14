import { describe, it, expect, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createTestApp } from "./helpers/app";
import { resetDb, disconnectDb } from "./helpers/db";
import { createSellableVariant } from "./helpers/factories";
import { prisma } from "../src/config/prisma";
import { normalizeText } from "../src/utils/normalizeText";

let app: ReturnType<typeof createTestApp>;

beforeEach(async () => {
  await resetDb();
  app = createTestApp();
});

afterAll(async () => {
  await disconnectDb();
});

describe("Catálogo — precios y disponibilidad (NUEVO-02/NUEVO-03)", () => {
  it("el listado de categoría devuelve precioDesde como texto decimal fijo, no number", async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "129.99" });

    const res = await supertest(app).get(`/api/categories/${variant.categorySlug}/products`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].precioDesde).toBe("129.99");
    expect(typeof res.body.data.items[0].precioDesde).toBe("string");
  });

  it("la búsqueda también devuelve precioDesde como texto (NUEVO-03)", async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "45.50" });
    await supertest(app).get(`/api/categories/${variant.categorySlug}/products`); // sanity: el producto existe

    const res = await supertest(app).get("/api/search").query({ q: "Producto de prueba" });

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(typeof res.body.data.items[0].precioDesde).toBe("string");
  });

  it("un producto totalmente reservado (cantidadReservada = cantidadDisponible) sale como no disponible (NUEVO-02)", async () => {
    const variant = await createSellableVariant({ stock: 5, cantidadReservada: 5 });

    const listado = await supertest(app).get(`/api/categories/${variant.categorySlug}/products`);
    expect(listado.body.data.items[0].disponible).toBe(false);

    const ficha = await supertest(app).get(`/api/products/${variant.productSlug}`);
    expect(ficha.body.data.variantes[0].disponible).toBe(false);
    expect(ficha.body.data.variantes[0].stockDisponible).toBe(0);
  });

  it("con stock parcialmente reservado, la ficha muestra solo el stock vendible restante", async () => {
    const variant = await createSellableVariant({ stock: 10, cantidadReservada: 7 });

    const ficha = await supertest(app).get(`/api/products/${variant.productSlug}`);

    expect(ficha.body.data.variantes[0].disponible).toBe(true);
    expect(ficha.body.data.variantes[0].stockDisponible).toBe(3);
  });
});

describe("Búsqueda — relevancia (NUEVO-06)", () => {
  async function createSearchableProduct(nombre: string) {
    const category = await prisma.category.create({ data: { slug: `cat-${Date.now()}-${Math.random()}`, nombre: "Cat" } });
    return prisma.product.create({
      data: {
        slug: `prod-${Date.now()}-${Math.random()}`,
        nombre,
        estado: "activo",
        categoriaId: category.id,
        busqueda: normalizeText(nombre),
      },
    });
  }

  it("un producto cuyo nombre EMPIEZA con el término buscado sale primero, aunque sea más viejo", async () => {
    // Se crea primero (más viejo) el que empieza con "sarten" — si el orden
    // fuera solo por novedad (createdAt desc), "Olla con sartén de regalo"
    // (creado después) saldría primero. Con NUEVO-06 corregido, gana el que
    // EMPIEZA con el término sin importar cuál es más nuevo.
    await createSearchableProduct("Sartén Chef 24cm");
    await createSearchableProduct("Olla con sartén de regalo");

    const res = await supertest(app).get("/api/search").query({ q: "sarten" });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].nombre).toBe("Sartén Chef 24cm");
    expect(res.body.data.items[1].nombre).toBe("Olla con sartén de regalo");
  });

  it("un q de solo espacios no rompe la búsqueda (no arma SQL crudo vacío)", async () => {
    const res = await supertest(app).get("/api/search").query({ q: "  " });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});
