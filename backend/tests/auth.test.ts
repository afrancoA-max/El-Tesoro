import { describe, it, expect, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createTestApp } from "./helpers/app";
import { resetDb, disconnectDb } from "./helpers/db";

const CREDENTIALS = { nombre: "Cliente de prueba", email: "cliente@example.com", password: "clave1234" };

let app: ReturnType<typeof createTestApp>;

beforeEach(async () => {
  await resetDb();
  app = createTestApp();
});

afterAll(async () => {
  await disconnectDb();
});

describe("POST /api/auth/register", () => {
  it("crea la cuenta y no expone la contraseña", async () => {
    const res = await supertest(app).post("/api/auth/register").send(CREDENTIALS);

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(CREDENTIALS.email);
    expect(res.body.data.user).not.toHaveProperty("password");
    expect(res.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("rechaza un correo ya registrado (409)", async () => {
    await supertest(app).post("/api/auth/register").send(CREDENTIALS);
    const res = await supertest(app).post("/api/auth/register").send(CREDENTIALS);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    const res = await supertest(app).post("/api/auth/register").send(CREDENTIALS);
    expect(res.status).toBe(201);
  });

  it("inicia sesión con credenciales válidas y pone las cookies", async () => {
    const res = await supertest(app).post("/api/auth/login").send({ email: CREDENTIALS.email, password: CREDENTIALS.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(CREDENTIALS.email);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("eltesoro_at="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("eltesoro_rt="))).toBe(true);
  });

  it("rechaza contraseña incorrecta (401, mismo código que correo inexistente)", async () => {
    const wrongPassword = await supertest(app).post("/api/auth/login").send({ email: CREDENTIALS.email, password: "incorrecta1" });
    const noExiste = await supertest(app).post("/api/auth/login").send({ email: "no-existe@example.com", password: "cualquiera1" });

    expect(wrongPassword.status).toBe(401);
    expect(noExiste.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(noExiste.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("Sesión: refresh y /me", () => {
  it("refresca la sesión con el refresh token de la cookie y rota el token", async () => {
    const agent = supertest.agent(app);
    const registered = await agent.post("/api/auth/register").send(CREDENTIALS);
    expect(registered.status).toBe(201);
    const loggedIn = await agent.post("/api/auth/login").send({ email: CREDENTIALS.email, password: CREDENTIALS.password });
    expect(loggedIn.status).toBe(200);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(CREDENTIALS.email);

    const refreshed = await agent.post("/api/auth/refresh").send();
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.user.email).toBe(CREDENTIALS.email);
  });

  it("/api/auth/refresh sin cookie responde 401", async () => {
    const res = await supertest(app).post("/api/auth/refresh").send();
    expect(res.status).toBe(401);
  });

  it("/api/auth/me sin sesión responde 401", async () => {
    const res = await supertest(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
