import "dotenv/config";

// INF-04: guardas para que estas pruebas nunca puedan correr por accidente
// contra staging o producción — solo contra la base real que CI levanta
// como servicio, o una base local dedicada a pruebas.
if (process.env.NODE_ENV === "production") {
  throw new Error("Las pruebas no pueden correr con NODE_ENV=production.");
}

// INF-04 (15-sep, incidente real): la validación original solo exigía que
// el HOST fuera local (localhost/127.0.0.1) — un DATABASE_URL de
// desarrollo normal (`eltesoro_dev`, ver backend/.env) pasaba esa validación
// igual que una base de pruebas real, así que un simple `npm test` local
// truncó por accidente el catálogo de desarrollo (borró el trabajo de
// importación del negocio) sin ningún aviso. Ahora también se exige que el
// NOMBRE de la base contenga "test" — obliga a tener una base separada
// (`eltesoro_test`, igual que la que levanta CI) para poder correr esta
// suite localmente.
const databaseName = process.env.DATABASE_URL?.split("/").pop()?.split("?")[0] ?? "";
if (!process.env.DATABASE_URL || !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) || !/test/i.test(databaseName)) {
  throw new Error(
    "DATABASE_URL debe apuntar a una base de PRUEBAS local cuyo NOMBRE contenga \"test\" (ej. eltesoro_test) en localhost/127.0.0.1, " +
      "o a la del servicio de CI. Estas pruebas truncan tablas — nunca las corras contra tu base de desarrollo normal ni contra staging/producción.",
  );
}

process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? "http://localhost:3000";

// Módulo 07 — pagos: credenciales de prueba (nunca reales) para que
// payments.test.ts pueda firmar/verificar sin depender de que quien corre
// las pruebas tenga configuradas las de CyberSource — nunca se llama al
// sandbox real desde la suite (Secure Acceptance no requiere una llamada
// saliente para cobrar, solo firmar/verificar formularios, ver
// payments.test.ts).
process.env.CYBERSOURCE_PROFILE_ID = process.env.CYBERSOURCE_PROFILE_ID ?? "test-profile-id";
process.env.CYBERSOURCE_ACCESS_KEY = process.env.CYBERSOURCE_ACCESS_KEY ?? "test-access-key";
process.env.CYBERSOURCE_SECRET_KEY = process.env.CYBERSOURCE_SECRET_KEY ?? "test-secret-key";
