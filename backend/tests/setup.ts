import "dotenv/config";

// INF-04: guardas para que estas pruebas nunca puedan correr por accidente
// contra staging o producción — solo contra la base real que CI levanta
// como servicio, o una base local dedicada a pruebas.
if (process.env.NODE_ENV === "production") {
  throw new Error("Las pruebas no pueden correr con NODE_ENV=production.");
}

if (!process.env.DATABASE_URL || !/test|localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)) {
  throw new Error(
    "DATABASE_URL debe apuntar a una base de PRUEBAS local (localhost/127.0.0.1) o a la del servicio de CI. " +
      "Estas pruebas truncan tablas — nunca las corras contra staging o producción.",
  );
}

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? "http://localhost:3000";
