import { describe, it, expect, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createTestApp } from "./helpers/app";
import { resetDb, disconnectDb } from "./helpers/db";
import { createSellableVariant } from "./helpers/factories";
import { prisma } from "../src/config/prisma";
import { env } from "../src/config/env";
import { signFields } from "../src/services/payments/secureAcceptanceSigning";

let app: ReturnType<typeof createTestApp>;

beforeEach(async () => {
  await resetDb();
  await prisma.setting.create({ data: { clave: "pagos_en_linea_habilitado", valor: "true" } });
  app = createTestApp();
});

afterAll(async () => {
  await disconnectDb();
});

/// Crea una orden pendiente_pago vía el flujo real de checkout (mismo
/// camino que checkout.test.ts) y devuelve su número + el `accessToken` de
/// invitado, para poder cobrarla en los tests de pagos.
async function crearOrdenPendiente(agent: ReturnType<typeof supertest.agent>, opts: { stock?: number; precio?: string } = {}) {
  const variant = await createSellableVariant({ stock: opts.stock ?? 5, precio: opts.precio ?? "100.00" });
  await agent.post("/api/cart/items").send({ variantId: variant.id, cantidad: 1 });
  const res = await agent.post("/api/orders").send({
    contacto: { email: "cliente@example.com", telefono: "5512-3456" },
    facturacion: { nit: "CF", nombre: "Consumidor Final" },
    metodoEnvioCodigo: "recoger_tienda",
  });
  expect(res.status).toBe(201);
  return { numero: res.body.data.order.numero as string, token: res.body.data.order.accessToken as string, variantId: variant.id };
}

/// Construye y firma un payload de reply/IPN de Secure Acceptance, igual
/// forma que CyberSource lo devolvería — usado para simular tanto la
/// respuesta aprobada como la rechazada en los tests.
function respuestaFirmada(opts: { numero: string; transactionUuid: string; decision: string; transactionId?: string; motivo?: string }) {
  const fields: Record<string, string> = {
    decision: opts.decision,
    req_reference_number: opts.numero,
    req_transaction_uuid: opts.transactionUuid,
    req_amount: "100.00",
    req_currency: "GTQ",
    ...(opts.transactionId ? { transaction_id: opts.transactionId } : {}),
    ...(opts.motivo ? { message: opts.motivo } : {}),
  };
  const signedFieldNames = Object.keys(fields);
  const signature = signFields(fields, signedFieldNames, env.cybersourceSecretKey);
  return { ...fields, signed_field_names: signedFieldNames.join(","), signature };
}

describe("Pagos — formulario de Secure Acceptance Hosted Checkout", () => {
  it("arma y firma el formulario para una orden pendiente", async () => {
    const agent = supertest.agent(app);
    const { numero, token } = await crearOrdenPendiente(agent);

    const res = await agent.get(`/api/payments/orders/${numero}/hosted-checkout-form?token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.postUrl).toContain("testsecureacceptance.cybersource.com");
    expect(res.body.data.fields.reference_number).toBe(numero);
    expect(res.body.data.fields.profile_id).toBe(env.cybersourceProfileId);
    expect(res.body.data.fields.signature).toBeTruthy();

    // `signed_field_names` debe listar EXACTAMENTE los campos sobre los que
    // se calculó la firma — si declarara un conjunto distinto al que
    // realmente se firmó, CyberSource recalcularía sobre otros datos y
    // rechazaría la transacción entera con "not authorized" (bug real que
    // este test habría detectado). Este perfil (VisaNet Guatemala) exige
    // firmar todos los campos, incluida la facturación — ver
    // cybersourceAdapter.ts.
    const fields: Record<string, string> = res.body.data.fields;
    const expectedSignature = signFields(fields, fields.signed_field_names.split(","), env.cybersourceSecretKey);
    expect(fields.signature).toBe(expectedSignature);
    expect(fields.signed_field_names.split(",")).toContain("bill_to_forename");
    expect(fields.unsigned_field_names).toBe("");

    const order = await prisma.order.findUniqueOrThrow({ where: { numero } });
    expect(order.estado).toBe("pendiente_pago");
  });

  it("rechaza armar el formulario de una orden ajena (sin accessToken ni sesión del dueño)", async () => {
    const owner = supertest.agent(app);
    const { numero } = await crearOrdenPendiente(owner);

    const intruder = supertest.agent(app);
    const res = await intruder.get(`/api/payments/orders/${numero}/hosted-checkout-form`);

    expect(res.status).toBe(404);
  });
});

describe("Pagos — reply/IPN de Secure Acceptance", () => {
  it("un reply válido (ACCEPT) confirma la orden y descuenta el stock en definitiva", async () => {
    const agent = supertest.agent(app);
    const { numero, token, variantId } = await crearOrdenPendiente(agent, { stock: 5 });

    const payload = respuestaFirmada({ numero, transactionUuid: "uuid-1", decision: "ACCEPT", transactionId: "TXN-1" });
    const res = await agent
      .post("/api/payments/secure-acceptance/receipt")
      .query({ token })
      .type("form")
      .send(payload);

    expect(res.status).toBe(303);
    expect(res.headers.location).toContain(`/checkout/confirmacion/${numero}`);

    const order = await prisma.order.findUniqueOrThrow({ where: { numero } });
    expect(order.estado).toBe("pagado");
    expect(order.pagoTransactionId).toBe("TXN-1");

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId } });
    expect(inventory.cantidadDisponible).toBe(4);
    expect(inventory.cantidadReservada).toBe(0);

    const events = await prisma.paymentEvent.findMany({ where: { orderId: order.id } });
    expect(events).toHaveLength(1);
    expect(events[0].procesadoOk).toBe(true);
  });

  it("el mismo reply recibido dos veces (mismo transaction_uuid) no duplica el descuento de stock ni el evento", async () => {
    const agent = supertest.agent(app);
    const { numero, token, variantId } = await crearOrdenPendiente(agent, { stock: 5 });

    const payload = respuestaFirmada({ numero, transactionUuid: "uuid-dup", decision: "ACCEPT", transactionId: "TXN-2" });

    await agent.post("/api/payments/secure-acceptance/receipt").query({ token }).type("form").send(payload);
    await agent.post("/api/payments/secure-acceptance/receipt").query({ token }).type("form").send(payload);

    const order = await prisma.order.findUniqueOrThrow({ where: { numero } });
    expect(order.estado).toBe("pagado");

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId } });
    expect(inventory.cantidadDisponible).toBe(4);

    const events = await prisma.paymentEvent.findMany({ where: { orderId: order.id } });
    expect(events).toHaveLength(1);
  });

  it("un reply con firma inválida no confirma la orden (aunque redirige igual para no atorar al cliente)", async () => {
    const agent = supertest.agent(app);
    const { numero, token } = await crearOrdenPendiente(agent);

    const payload = respuestaFirmada({ numero, transactionUuid: "uuid-bad-sig", decision: "ACCEPT", transactionId: "TXN-3" });
    payload.signature = "firma-invalida-a-mano";

    const res = await agent.post("/api/payments/secure-acceptance/receipt").query({ token }).type("form").send(payload);

    expect(res.status).toBe(303);

    const order = await prisma.order.findUniqueOrThrow({ where: { numero } });
    expect(order.estado).toBe("pendiente_pago");

    const events = await prisma.paymentEvent.findMany({ where: { orderId: order.id } });
    expect(events).toHaveLength(0);
  });

  it("el IPN rechaza con 401 una firma inválida y con 200 procesa una válida", async () => {
    const agent = supertest.agent(app);
    const { numero, variantId } = await crearOrdenPendiente(agent, { stock: 5 });

    const bad = respuestaFirmada({ numero, transactionUuid: "uuid-ipn-bad", decision: "ACCEPT", transactionId: "TXN-4" });
    bad.signature = "otra-firma-invalida";
    const badRes = await agent.post("/api/payments/secure-acceptance/ipn").type("form").send(bad);
    expect(badRes.status).toBe(401);

    const good = respuestaFirmada({ numero, transactionUuid: "uuid-ipn-ok", decision: "ACCEPT", transactionId: "TXN-5" });
    const goodRes = await agent.post("/api/payments/secure-acceptance/ipn").type("form").send(good);
    expect(goodRes.status).toBe(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { numero } });
    expect(order.estado).toBe("pagado");

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId } });
    expect(inventory.cantidadDisponible).toBe(4);
  });

  it("un pago rechazado deja la orden pendiente y reintentable, conservando la reserva", async () => {
    const agent = supertest.agent(app);
    const { numero, token, variantId } = await crearOrdenPendiente(agent, { stock: 5 });

    const declined = respuestaFirmada({ numero, transactionUuid: "uuid-declined", decision: "DECLINE", motivo: "Fondos insuficientes" });
    const res = await agent.post("/api/payments/secure-acceptance/receipt").query({ token }).type("form").send(declined);
    expect(res.status).toBe(303);

    let order = await prisma.order.findUniqueOrThrow({ where: { numero } });
    expect(order.estado).toBe("pendiente_pago");
    expect(order.pagoUltimoError).toBe("Fondos insuficientes");

    const inventoryTrasRechazo = await prisma.inventory.findUniqueOrThrow({ where: { variantId } });
    expect(inventoryTrasRechazo.cantidadDisponible).toBe(5);
    expect(inventoryTrasRechazo.cantidadReservada).toBe(1);

    // Reintento sobre la misma orden: se puede volver a pedir el
    // formulario porque sigue pendiente_pago.
    const formRes = await agent.get(`/api/payments/orders/${numero}/hosted-checkout-form?token=${token}`);
    expect(formRes.status).toBe(200);

    const aprobado = respuestaFirmada({ numero, transactionUuid: "uuid-retry-ok", decision: "ACCEPT", transactionId: "TXN-6" });
    await agent.post("/api/payments/secure-acceptance/receipt").query({ token }).type("form").send(aprobado);

    order = await prisma.order.findUniqueOrThrow({ where: { numero } });
    expect(order.estado).toBe("pagado");
    expect(order.pagoUltimoError).toBeNull();
  });
});
