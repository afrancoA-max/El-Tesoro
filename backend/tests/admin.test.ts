import { describe, it, expect, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createTestApp } from "./helpers/app";
import { resetDb, disconnectDb } from "./helpers/db";
import { createInternalUser, createPaidOrder, createSellableVariant } from "./helpers/factories";
import { prisma } from "../src/config/prisma";
import { signAccessToken } from "../src/utils/tokens";
import type { Role } from "@el-tesoro/shared";

let app: ReturnType<typeof createTestApp>;

beforeEach(async () => {
  await resetDb();
  app = createTestApp();
});

afterAll(async () => {
  await disconnectDb();
});

async function authCookie(role: Role, nombre?: string) {
  const user = await createInternalUser(role, nombre);
  const token = signAccessToken({ sub: user.id, role });
  return { user, cookie: `eltesoro_at=${token}` };
}

async function createCategory() {
  return prisma.category.create({ data: { slug: `cat-${Date.now()}-${Math.random()}`, nombre: "Ollas" } });
}

describe("Módulo 08 — Panel admin: control de acceso", () => {
  it("un customer no puede entrar a ninguna ruta /api/admin", async () => {
    const { cookie } = await authCookie("customer" as Role);
    const res = await supertest(app).get("/api/admin/catalog/products").set("Cookie", [cookie]);
    expect(res.status).toBe(403);
  });

  it("sin autenticación, /api/admin responde 401", async () => {
    const res = await supertest(app).get("/api/admin/catalog/products");
    expect(res.status).toBe(401);
  });

  it("staff (gerente) puede leer catálogo pero no puede crear productos", async () => {
    const { cookie } = await authCookie("staff");
    const category = await createCategory();

    const read = await supertest(app).get("/api/admin/catalog/products").set("Cookie", [cookie]);
    expect(read.status).toBe(200);

    const write = await supertest(app)
      .post("/api/admin/catalog/products")
      .set("Cookie", [cookie])
      .send({ nombre: "Olla de prueba", categoriaId: category.id });
    expect(write.status).toBe(403);
  });

  it("operador puede ajustar inventario pero no puede avanzar pagos manuales", async () => {
    const { cookie } = await authCookie("operador");
    const order = await createPaidOrder();

    const confirmar = await supertest(app).post(`/api/admin/orders/${order.id}/confirm-payment`).set("Cookie", [cookie]);
    expect(confirmar.status).toBe(403);
  });

  it("GET /api/admin/me devuelve el rol y los permisos del usuario autenticado", async () => {
    const { cookie } = await authCookie("servicio_cliente");
    const res = await supertest(app).get("/api/admin/me").set("Cookie", [cookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("servicio_cliente");
    expect(res.body.data.permissions).toContain("orders:confirm_payment");
    expect(res.body.data.permissions).not.toContain("catalog:write");
  });
});

describe("Módulo 08 — Catálogo: crear y publicar un producto sin tocar la base de datos", () => {
  it("un producto nace en borrador (oculto) y aparece en el catálogo público solo tras publicarlo", async () => {
    const { cookie } = await authCookie("admin");
    const category = await createCategory();

    const createRes = await supertest(app)
      .post("/api/admin/catalog/products")
      .set("Cookie", [cookie])
      .send({ nombre: "Sartén de prueba", categoriaId: category.id, marca: "ElTesoro" });
    expect(createRes.status).toBe(201);
    const productId = createRes.body.data.id;
    expect(createRes.body.data.estado).toBe("borrador");

    const variantRes = await supertest(app)
      .post(`/api/admin/catalog/products/${productId}/variants`)
      .set("Cookie", [cookie])
      .send({ sku: `SKU-${Date.now()}`, precio: "199.99", cantidadDisponible: 10 });
    expect(variantRes.status).toBe(201);

    // Todavía en borrador: no debe verse en el listado público.
    const beforePublish = await supertest(app).get(`/api/categories/${category.slug}/products`);
    expect(beforePublish.body.data.items).toHaveLength(0);

    const publishRes = await supertest(app)
      .patch(`/api/admin/catalog/products/${productId}/estado`)
      .set("Cookie", [cookie])
      .send({ estado: "activo" });
    expect(publishRes.status).toBe(200);

    const afterPublish = await supertest(app).get(`/api/categories/${category.slug}/products`);
    expect(afterPublish.body.data.items).toHaveLength(1);
    expect(afterPublish.body.data.items[0].nombre).toBe("Sartén de prueba");
    // NUEVO-01: el trigger de Postgres, no el admin, calcula precioDesde a
    // partir de la variante recién creada.
    expect(afterPublish.body.data.items[0].precioDesde).toBe("199.99");
    expect(afterPublish.body.data.items[0].disponible).toBe(true);
  });

  it("desactivar un producto lo oculta del sitio pero conserva el historial de pedidos", async () => {
    const { cookie } = await authCookie("admin");
    const variant = await createSellableVariant({ stock: 5, precio: "80.00" });
    await prisma.product.update({ where: { slug: variant.productSlug }, data: { estado: "activo" } });
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: variant.productSlug } });
    const order = await createPaidOrder({ variantId: variant.id });

    const deactivate = await supertest(app)
      .patch(`/api/admin/catalog/products/${product.id}/estado`)
      .set("Cookie", [cookie])
      .send({ estado: "descontinuado" });
    expect(deactivate.status).toBe(200);

    const listado = await supertest(app).get(`/api/categories/${variant.categorySlug}/products`);
    expect(listado.body.data.items).toHaveLength(0);

    const historicOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(historicOrder.items[0].nombreProducto).toBe("Producto de prueba");
  });

  it("no se puede eliminar una categoría que todavía tiene productos", async () => {
    const { cookie } = await authCookie("admin");
    const variant = await createSellableVariant({ stock: 1 });
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: variant.categorySlug } });

    const res = await supertest(app).delete(`/api/admin/catalog/categories/${category.id}`).set("Cookie", [cookie]);
    expect(res.status).toBe(409);
  });
});

describe("Módulo 08 — Inventario: ajustes auditados", () => {
  it("un ajuste de stock se refleja de inmediato y queda registrado quién/cuándo/motivo", async () => {
    const { cookie, user } = await authCookie("operador", "Operador Uno");
    const variant = await createSellableVariant({ stock: 10 });

    const res = await supertest(app)
      .patch(`/api/admin/inventory/${variant.id}`)
      .set("Cookie", [cookie])
      .send({ delta: 15, motivo: "recepcion", notas: "Camión de bodega" });

    expect(res.status).toBe(201);
    expect(res.body.data.cantidadResultante).toBe(25);
    expect(res.body.data.adminNombre).toBe(user.nombre);

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });
    expect(inventory.cantidadDisponible).toBe(25);

    const history = await supertest(app).get(`/api/admin/inventory/${variant.id}/adjustments`).set("Cookie", [cookie]);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].motivo).toBe("recepcion");
  });

  it("un ajuste que dejaría el stock negativo se rechaza (409) y no cambia nada", async () => {
    const { cookie } = await authCookie("admin");
    const variant = await createSellableVariant({ stock: 3 });

    const res = await supertest(app).patch(`/api/admin/inventory/${variant.id}`).set("Cookie", [cookie]).send({ delta: -10, motivo: "merma" });

    expect(res.status).toBe(409);
    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });
    expect(inventory.cantidadDisponible).toBe(3);
  });
});

describe("Módulo 08 — Pedidos: ciclo operativo y cancelación", () => {
  it("un pedido pagado avanza paso a paso hasta entregado, dejando historial visible", async () => {
    const { cookie, user } = await authCookie("operador", "Operador Dos");
    const order = await createPaidOrder();

    // "pagado" solo avanza un paso a la vez, sin importar qué se mande en
    // el body — un guiaEnvio de más no lo salta directo a "enviado".
    const toPreparing = await supertest(app).post(`/api/admin/orders/${order.id}/advance`).set("Cookie", [cookie]).send({ guiaEnvio: "GUIA-1" });
    expect(toPreparing.status).toBe(200);
    expect(toPreparing.body.data.estado).toBe("en_preparacion");

    const missingGuia = await supertest(app).post(`/api/admin/orders/${order.id}/advance`).set("Cookie", [cookie]).send({});
    expect(missingGuia.status).toBe(400);

    const toShipped = await supertest(app)
      .post(`/api/admin/orders/${order.id}/advance`)
      .set("Cookie", [cookie])
      .send({ guiaEnvio: "GUIA-123" });
    expect(toShipped.status).toBe(200);
    expect(toShipped.body.data.estado).toBe("enviado");
    expect(toShipped.body.data.guiaEnvio).toBe("GUIA-123");

    const toDelivered = await supertest(app).post(`/api/admin/orders/${order.id}/advance`).set("Cookie", [cookie]).send({});
    expect(toDelivered.status).toBe(200);
    expect(toDelivered.body.data.estado).toBe("entregado");

    const historial = toDelivered.body.data.historial as Array<{ estadoNuevo: string; adminNombre: string | null }>;
    expect(historial.map((h) => h.estadoNuevo)).toEqual(["en_preparacion", "enviado", "entregado"]);
    expect(historial.every((h) => h.adminNombre === user.nombre)).toBe(true);

    // Ya no hay a dónde avanzar — "entregado" es el final del ciclo.
    const pastEnd = await supertest(app).post(`/api/admin/orders/${order.id}/advance`).set("Cookie", [cookie]).send({});
    expect(pastEnd.status).toBe(409);
  });

  it("servicio al cliente puede confirmar manualmente un pago pendiente", async () => {
    const { cookie } = await authCookie("servicio_cliente");
    const variant = await createSellableVariant({ stock: 10 });
    const order = await prisma.order.create({
      data: {
        numero: `AET-PEND-${Date.now()}`,
        estado: "pendiente_pago",
        facturacionNit: "CF",
        facturacionNombre: "Cliente pendiente",
        invitadoEmail: "pendiente@example.com",
        metodoEnvioCodigo: "recoger_tienda",
        metodoEnvioNombre: "Recoger en tienda",
        subtotal: "100.00",
        costoEnvio: "0.00",
        total: "100.00",
        ivaIncluidoInformativo: "0.00",
        items: { create: [{ variantId: variant.id, nombreProducto: "Producto", sku: variant.sku, cantidad: 2, precioUnitario: "50.00", subtotal: "100.00" }] },
      },
    });

    const res = await supertest(app).post(`/api/admin/orders/${order.id}/confirm-payment`).set("Cookie", [cookie]);
    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe("pagado");
    expect(res.body.data.pagadoEn).not.toBeNull();
  });

  it("cancelar un pedido pagado devuelve el stock descontado", async () => {
    const { cookie } = await authCookie("admin");
    const variant = await createSellableVariant({ stock: 10 });
    // Simula lo que markOrderAsPaid ya hizo: el stock real bajó 2 unidades.
    await prisma.inventory.update({ where: { variantId: variant.id }, data: { cantidadDisponible: 8 } });
    const order = await createPaidOrder({ variantId: variant.id, cantidad: 2 });

    const res = await supertest(app).post(`/api/admin/orders/${order.id}/cancel`).set("Cookie", [cookie]).send({ motivo: "Cliente se arrepintió" });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe("cancelado");
    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { variantId: variant.id } });
    expect(inventory.cantidadDisponible).toBe(10);
  });

  it("no se puede cancelar un pedido ya enviado", async () => {
    const { cookie } = await authCookie("admin");
    const order = await createPaidOrder();
    await prisma.order.update({ where: { id: order.id }, data: { estado: "enviado" } });

    const res = await supertest(app).post(`/api/admin/orders/${order.id}/cancel`).set("Cookie", [cookie]).send({ motivo: "Ya no lo quiere" });
    expect(res.status).toBe(409);
  });
});

describe("Módulo 08 — Reportes de ventas", () => {
  it("el total del reporte cuadra exactamente con las órdenes pagadas del rango", async () => {
    const { cookie } = await authCookie("staff");
    const dentro1 = await createPaidOrder({ total: "100.00", pagadoEn: new Date("2026-09-10T12:00:00Z") });
    const dentro2 = await createPaidOrder({ total: "50.50", pagadoEn: new Date("2026-09-12T12:00:00Z") });
    await createPaidOrder({ total: "999.00", pagadoEn: new Date("2026-08-01T12:00:00Z") }); // fuera de rango
    const cancelada = await createPaidOrder({ total: "77.00", pagadoEn: new Date("2026-09-11T12:00:00Z") });
    await prisma.order.update({ where: { id: cancelada.id }, data: { estado: "cancelado" } });

    const res = await supertest(app)
      .get("/api/admin/reports/sales")
      .query({ desde: "2026-09-01", hasta: "2026-09-30" })
      .set("Cookie", [cookie]);

    expect(res.status).toBe(200);
    expect(res.body.data.totales.cantidadOrdenes).toBe(2);
    expect(res.body.data.totales.totalVentas).toBe("150.50");

    const csv = await supertest(app)
      .get("/api/admin/reports/sales/export.csv")
      .query({ desde: "2026-09-01", hasta: "2026-09-30" })
      .set("Cookie", [cookie]);
    expect(csv.status).toBe(200);
    expect(csv.text).toContain(dentro1.numero);
    expect(csv.text).toContain(dentro2.numero);
    expect(csv.text).not.toContain(cancelada.numero);
  });
});

describe("Módulo 08 — Mantenimiento de usuarios internos", () => {
  it("un admin puede crear personal interno, verlo listado y cambiarle el rol", async () => {
    const { cookie } = await authCookie("admin");

    const created = await supertest(app).post("/api/admin/users").set("Cookie", [cookie]).send({
      email: "nuevo-operador@eltesoro.gt",
      nombre: "Nuevo Operador",
      password: "clave12345",
      role: "operador",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.activo).toBe(true);

    const list = await supertest(app).get("/api/admin/users").set("Cookie", [cookie]);
    expect(list.body.data.some((u: { email: string }) => u.email === "nuevo-operador@eltesoro.gt")).toBe(true);

    const promoted = await supertest(app)
      .patch(`/api/admin/users/${created.body.data.id}`)
      .set("Cookie", [cookie])
      .send({ role: "servicio_cliente" });
    expect(promoted.status).toBe(200);
    expect(promoted.body.data.role).toBe("servicio_cliente");
  });

  it("un usuario desactivado no puede iniciar sesión", async () => {
    const { cookie } = await authCookie("admin");
    const created = await supertest(app)
      .post("/api/admin/users")
      .set("Cookie", [cookie])
      .send({ email: "desactivado@eltesoro.gt", nombre: "Desactivado", password: "clave12345", role: "staff" });

    await supertest(app).patch(`/api/admin/users/${created.body.data.id}`).set("Cookie", [cookie]).send({ activo: false });

    const login = await supertest(app).post("/api/auth/login").send({ email: "desactivado@eltesoro.gt", password: "clave12345" });
    expect(login.status).toBe(401);
  });

  it("un admin no puede desactivarse ni quitarse el rol a sí mismo", async () => {
    const { cookie, user } = await authCookie("admin");

    const deactivateSelf = await supertest(app).patch(`/api/admin/users/${user.id}`).set("Cookie", [cookie]).send({ activo: false });
    expect(deactivateSelf.status).toBe(400);

    const demoteSelf = await supertest(app).patch(`/api/admin/users/${user.id}`).set("Cookie", [cookie]).send({ role: "staff" });
    expect(demoteSelf.status).toBe(400);
  });

  it("un gerente no puede acceder a mantenimiento de usuarios", async () => {
    const { cookie } = await authCookie("staff");
    const res = await supertest(app).get("/api/admin/users").set("Cookie", [cookie]);
    expect(res.status).toBe(403);
  });
});
