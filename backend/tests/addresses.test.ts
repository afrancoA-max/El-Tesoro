import { describe, it, expect, beforeEach, afterAll } from "vitest";
import supertest from "supertest";
import { createTestApp } from "./helpers/app";
import { resetDb, disconnectDb } from "./helpers/db";

// App nueva por test — ver helpers/app.ts.
let app: ReturnType<typeof createTestApp>;

beforeEach(async () => {
  await resetDb();
  app = createTestApp();
});

afterAll(async () => {
  await disconnectDb();
});

const VALID_ADDRESS = {
  nombreDestinatario: "Cliente de prueba",
  telefono: "55123456",
  departamento: "Guatemala",
  municipio: "Guatemala",
  direccion: "5a avenida 10-20 zona 1",
};

async function registerAndLogin(agent: ReturnType<typeof supertest.agent>, email: string) {
  await agent.post("/api/auth/register").send({ nombre: "Cliente", email, password: "clave1234" });
  await agent.post("/api/auth/login").send({ email, password: "clave1234" });
}

describe("Direcciones", () => {
  it("crea una dirección para la cuenta autenticada", async () => {
    const agent = supertest.agent(app);
    await registerAndLogin(agent, "dueno@example.com");

    const res = await agent.post("/api/account/addresses").send(VALID_ADDRESS);

    expect(res.status).toBe(201);
    expect(res.body.data.address.departamento).toBe("Guatemala");
    expect(res.body.data.address.esPredeterminada).toBe(true);
  });

  it("IDOR: actualizar o borrar la dirección de otra cuenta responde 404, no 403", async () => {
    const ownerAgent = supertest.agent(app);
    await registerAndLogin(ownerAgent, "dueno@example.com");
    const created = await ownerAgent.post("/api/account/addresses").send(VALID_ADDRESS);
    const addressId = created.body.data.address.id;

    const attackerAgent = supertest.agent(app);
    await registerAndLogin(attackerAgent, "atacante@example.com");

    const update = await attackerAgent.put(`/api/account/addresses/${addressId}`).send({ ...VALID_ADDRESS, direccion: "otra dirección 123" });
    const del = await attackerAgent.delete(`/api/account/addresses/${addressId}`);

    expect(update.status).toBe(404);
    expect(update.body.error.code).toBe("ADDRESS_NOT_FOUND");
    expect(del.status).toBe(404);
    expect(del.body.error.code).toBe("ADDRESS_NOT_FOUND");

    // La dirección del dueño sigue intacta.
    const list = await ownerAgent.get("/api/account/addresses");
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].direccion).toBe(VALID_ADDRESS.direccion);
  });

  it("un ID inexistente responde exactamente igual que uno de otro dueño (mismo 404)", async () => {
    const agent = supertest.agent(app);
    await registerAndLogin(agent, "cliente@example.com");

    const res = await agent.put("/api/account/addresses/00000000-0000-0000-0000-000000000000").send(VALID_ADDRESS);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ADDRESS_NOT_FOUND");
  });

  it("sin sesión responde 401", async () => {
    const res = await supertest(app).get("/api/account/addresses");
    expect(res.status).toBe(401);
  });
});
