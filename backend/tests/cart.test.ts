import { describe, it, expect, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createTestApp } from "./helpers/app";
import { resetDb, disconnectDb } from "./helpers/db";
import { createSellableVariant } from "./helpers/factories";

// App nueva por test — ver helpers/app.ts (los rate limiters de auth son en
// memoria por instancia y varias pruebas de este archivo registran/inician
// sesión).
let app: ReturnType<typeof createTestApp>;

beforeEach(async () => {
  await resetDb();
  app = createTestApp();
});

afterAll(async () => {
  await disconnectDb();
});

async function registerAndLogin(agent: ReturnType<typeof supertest.agent>, email: string) {
  await agent.post("/api/auth/register").send({ nombre: "Cliente", email, password: "clave1234" });
  await agent.post("/api/auth/login").send({ email, password: "clave1234" });
}

describe("Carrito", () => {
  it("agregar como invitado pone la cookie del carrito y crea la línea", async () => {
    const variant = await createSellableVariant({ stock: 10 });
    const agent = supertest.agent(app);

    const res = await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.limitado).toBe(false);
    expect(res.body.data.cart.items).toHaveLength(1);
    expect(res.body.data.cart.items[0].cantidad).toBe(2);
  });

  it("pedir más que el stock disponible limita la cantidad y avisa (CAR-03)", async () => {
    const variant = await createSellableVariant({ stock: 4 });
    const agent = supertest.agent(app);

    const res = await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 10 });

    expect(res.status).toBe(201);
    expect(res.body.data.limitado).toBe(true);
    expect(res.body.data.cart.items[0].cantidad).toBe(4);
  });

  it("NUEVO-02: el stock reservado por otro checkout no se puede agregar al carrito", async () => {
    // 5 en existencia, pero las 5 ya están reservadas por otra orden en
    // curso (Módulo 06) — el stock vendible real es 0.
    const variant = await createSellableVariant({ stock: 5, cantidadReservada: 5 });
    const agent = supertest.agent(app);

    const res = await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("OUT_OF_STOCK");
  });

  it("NUEVO-02: con stock parcialmente reservado, solo se puede agregar lo vendible", async () => {
    const variant = await createSellableVariant({ stock: 10, cantidadReservada: 8 });
    const agent = supertest.agent(app);

    const res = await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 5 });

    expect(res.status).toBe(201);
    expect(res.body.data.limitado).toBe(true);
    expect(res.body.data.cart.items[0].cantidad).toBe(2);
  });

  it("fusiona el carrito anónimo con el de la cuenta al iniciar sesión", async () => {
    const variant = await createSellableVariant({ stock: 10 });
    const agent = supertest.agent(app);

    // Agrega como invitado (queda la cookie de carrito en el agente).
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 3 });

    await registerAndLogin(agent, "fusion@example.com");

    const merged = await agent.post("/api/cart/merge").send();
    expect(merged.status).toBe(200);
    expect(merged.body.data.cart.items).toHaveLength(1);
    expect(merged.body.data.cart.items[0].cantidad).toBe(3);

    // El carrito de la cuenta sigue ahí en una nueva consulta.
    const cart = await agent.get("/api/cart");
    expect(cart.body.data.items).toHaveLength(1);
  });

  it("IDOR: no se puede modificar ni borrar una línea del carrito de otra cuenta (404, no 403)", async () => {
    const variant = await createSellableVariant({ stock: 10 });

    const ownerAgent = supertest.agent(app);
    await registerAndLogin(ownerAgent, "dueno@example.com");
    const added = await ownerAgent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });
    const itemId = added.body.data.cart.items[0].id;

    const attackerAgent = supertest.agent(app);
    await registerAndLogin(attackerAgent, "atacante@example.com");

    const patch = await attackerAgent.patch(`/api/cart/items/${itemId}`).send({ cantidad: 5 });
    const del = await attackerAgent.delete(`/api/cart/items/${itemId}`);

    expect(patch.status).toBe(404);
    expect(patch.body.error.code).toBe("CART_ITEM_NOT_FOUND");
    expect(del.status).toBe(404);
    expect(del.body.error.code).toBe("CART_ITEM_NOT_FOUND");

    // La línea del dueño sigue intacta.
    const ownerCart = await ownerAgent.get("/api/cart");
    expect(ownerCart.body.data.items).toHaveLength(1);
    expect(ownerCart.body.data.items[0].cantidad).toBe(1);
  });
});
