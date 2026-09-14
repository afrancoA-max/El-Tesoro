import { describe, it, expect, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createTestApp } from "./helpers/app";
import { resetDb, disconnectDb } from "./helpers/db";
import { createSellableVariant } from "./helpers/factories";
import { prisma } from "../src/config/prisma";
import { releaseExpiredReservations } from "../src/services/order.service";

let app: ReturnType<typeof createTestApp>;

beforeEach(async () => {
  await resetDb();
  app = createTestApp();
});

afterAll(async () => {
  await disconnectDb();
});

async function registerAndLogin(agent: ReturnType<typeof supertest.agent>, email: string) {
  await agent.post("/api/auth/register").send({ nombre: "Cliente Prueba", email, password: "clave1234" });
  await agent.post("/api/auth/login").send({ email, password: "clave1234" });
}

describe("Checkout — interruptor de pago en línea (Neonet)", () => {
  it("sin ajuste en settings, arranca en modo 'solo cotizar' (false)", async () => {
    const agent = supertest.agent(app);
    const res = await agent.get("/api/checkout/config");

    expect(res.status).toBe(200);
    expect(res.body.data.pagosEnLineaHabilitado).toBe(false);
  });

  it("respeta el valor guardado en settings cuando se activa", async () => {
    await prisma.setting.create({ data: { clave: "pagos_en_linea_habilitado", valor: "true" } });
    const agent = supertest.agent(app);

    const res = await agent.get("/api/checkout/config");

    expect(res.body.data.pagosEnLineaHabilitado).toBe(true);
  });
});

describe("Checkout — creación de orden", () => {
  it("un invitado crea una orden con recoger en tienda y recibe correlativo + accessToken", async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "100.00" });
    const agent = supertest.agent(app);

    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 2 });

    const res = await agent.post("/api/orders").send({
      contacto: { email: "invitado@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "recoger_tienda",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.order.numero).toMatch(/^AET-\d{4}-\d{5}$/);
    expect(res.body.data.order.accessToken).toBeTruthy();
    expect(res.body.data.order.estado).toBe("pendiente_pago");
    expect(res.body.data.order.subtotal).toBe("200.00");
    expect(res.body.data.order.costoEnvio).toBe("0.00");
    expect(res.body.data.order.total).toBe("200.00");

    // 7.1: el carrito queda vacío y activo, nunca "convertido".
    const cart = await agent.get("/api/cart");
    expect(cart.body.data.items).toHaveLength(0);
  });

  it("reserva stock: la cantidad reservada se refleja en cantidadReservada, no en cantidadDisponible", async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "50.00" });
    const agent = supertest.agent(app);
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 3 });

    await agent.post("/api/orders").send({
      contacto: { email: "reserva@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "recoger_tienda",
    });

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });
    expect(inventory.cantidadDisponible).toBe(5);
    expect(inventory.cantidadReservada).toBe(3);
  });

  it("dos checkouts simultáneos sobre la última unidad: solo uno reserva, el otro recibe 409", async () => {
    const variant = await createSellableVariant({ stock: 1, precio: "80.00" });
    const agentA = supertest.agent(app);
    const agentB = supertest.agent(app);

    await agentA.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });
    await agentB.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });

    const [resA, resB] = await Promise.all([
      agentA.post("/api/orders").send({
        contacto: { email: "a@example.com", telefono: "5512-3456" },
        facturacion: { nit: "CF", nombre: "Cliente A" },
        metodoEnvioCodigo: "recoger_tienda",
      }),
      agentB.post("/api/orders").send({
        contacto: { email: "b@example.com", telefono: "5512-3456" },
        facturacion: { nit: "CF", nombre: "Cliente B" },
        metodoEnvioCodigo: "recoger_tienda",
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it("rechaza la orden si el carrito pide más de lo que hay vendible, con el producto y la cantidad disponible", async () => {
    const variant = await createSellableVariant({ stock: 10, cantidadReservada: 9, precio: "20.00" });
    const agent = supertest.agent(app);
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });
    // Otra reserva se lleva la última unidad justo después de agregar al carrito.
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { cantidadReservada: 10 } });

    const res = await agent.post("/api/orders").send({
      contacto: { email: "sinstock@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "recoger_tienda",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("rechaza un carrito vacío", async () => {
    const agent = supertest.agent(app);
    const res = await agent.post("/api/orders").send({
      contacto: { email: "vacio@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "recoger_tienda",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EMPTY_CART");
  });

  it("envío a domicilio calcula el costo server-side por departamento, ignorando lo que mande el cliente", async () => {
    await prisma.shippingRate.create({ data: { transportista: "cargo_expreso", departamento: "Guatemala", costo: "30.00" } });
    const variant = await createSellableVariant({ stock: 5, precio: "40.00" });
    const agent = supertest.agent(app);
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });

    const res = await agent.post("/api/orders").send({
      direccion: {
        nombreDestinatario: "Cliente Prueba",
        telefono: "5512-3456",
        departamento: "Guatemala",
        municipio: "Guatemala",
        direccion: "5ta avenida 10-20, zona 1",
      },
      contacto: { email: "domicilio@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "cargo_expreso",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.order.costoEnvio).toBe("30.00");
    expect(res.body.data.order.total).toBe("70.00");
  });

  it("envío gratis a partir del umbral configurado", async () => {
    await prisma.shippingRate.create({ data: { transportista: "forza", departamento: "Guatemala", costo: "30.00" } });
    await prisma.setting.create({ data: { clave: "envio_gratis_umbral", valor: "500.00" } });
    const variant = await createSellableVariant({ stock: 5, precio: "600.00" });
    const agent = supertest.agent(app);
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });

    const res = await agent.post("/api/orders").send({
      direccion: {
        nombreDestinatario: "Cliente Prueba",
        telefono: "5512-3456",
        departamento: "Guatemala",
        municipio: "Guatemala",
        direccion: "5ta avenida 10-20, zona 1",
      },
      contacto: { email: "gratis@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "forza",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.order.costoEnvio).toBe("0.00");
  });

  it("un usuario con sesión usa una dirección guardada precargada, sin volver a escribirla", async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "90.00" });
    await prisma.shippingRate.create({ data: { transportista: "cargo_expreso", departamento: "Guatemala", costo: "20.00" } });
    const agent = supertest.agent(app);
    await registerAndLogin(agent, "conaddress@example.com");

    const addressRes = await agent.post("/api/account/addresses").send({
      nombreDestinatario: "Cliente Prueba",
      telefono: "5512-3456",
      departamento: "Guatemala",
      municipio: "Guatemala",
      direccion: "5ta avenida 10-20, zona 1",
    });
    const addressId = addressRes.body.data.address.id;

    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });

    const res = await agent.post("/api/orders").send({
      addressId,
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "cargo_expreso",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.order.direccionEnvio.departamento).toBe("Guatemala");
    expect(res.body.data.order.accessToken).toBeUndefined();
  });

  it('la orden creada aparece en "Mis pedidos" de la cuenta', async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "15.00" });
    const agent = supertest.agent(app);
    await registerAndLogin(agent, "mispedidos@example.com");
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 2 });
    await agent.post("/api/orders").send({
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "recoger_tienda",
    });

    const res = await agent.get("/api/account/orders");
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].totalUnidades).toBe(2);
  });

  it("cambiar el precio del producto después no altera el total de una orden ya creada (snapshot)", async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "100.00" });
    const agent = supertest.agent(app);
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });
    const created = await agent.post("/api/orders").send({
      contacto: { email: "snapshot@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "recoger_tienda",
    });
    const { numero, accessToken } = created.body.data.order;

    await prisma.productVariant.update({ where: { id: variant.id }, data: { precio: "999.00" } });

    const fetched = await agent.get(`/api/orders/${numero}?token=${accessToken}`);
    expect(fetched.body.data.order.subtotal).toBe("100.00");
  });
});

describe("Checkout — expiración de reserva de stock", () => {
  it("libera la reserva y cancela la orden cuando ya pasó fechaExpiracionReserva", async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "60.00" });
    const agent = supertest.agent(app);
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 2 });
    const created = await agent.post("/api/orders").send({
      contacto: { email: "expira@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "recoger_tienda",
    });
    const orderId = created.body.data.order.id;

    // Simula que ya pasó el tiempo de reserva (acelerar expiración en
    // staging = mover esta fecha al pasado, mismo mecanismo).
    await prisma.order.update({ where: { id: orderId }, data: { fechaExpiracionReserva: new Date(Date.now() - 1000) } });

    const releasedCount = await releaseExpiredReservations();
    expect(releasedCount).toBe(1);

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });
    expect(inventory.cantidadReservada).toBe(0);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.estado).toBe("cancelado");
    expect(order.motivoCancelacion).toBe("expirada_reserva");
  });

  it("no toca una orden todavía dentro de su ventana de reserva", async () => {
    const variant = await createSellableVariant({ stock: 5, precio: "60.00" });
    const agent = supertest.agent(app);
    await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });
    await agent.post("/api/orders").send({
      contacto: { email: "vigente@example.com", telefono: "5512-3456" },
      facturacion: { nit: "CF", nombre: "Consumidor Final" },
      metodoEnvioCodigo: "recoger_tienda",
    });

    const releasedCount = await releaseExpiredReservations();
    expect(releasedCount).toBe(0);

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });
    expect(inventory.cantidadReservada).toBe(1);
  });
});
