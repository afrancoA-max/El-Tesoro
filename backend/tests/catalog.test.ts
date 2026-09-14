import { describe, it, expect, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createTestApp } from "./helpers/app";
import { resetDb, disconnectDb } from "./helpers/db";
import { createSellableVariant } from "./helpers/factories";

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
