import { createApp } from "../../src/app";

// Una app nueva por test (no un singleton compartido): los rate limiters de
// registro/login (express-rate-limit) guardan su contador en memoria por
// instancia de la app, y todas las pruebas comparten la misma IP (127.0.0.1)
// — reusar una sola app agota esos límites entre pruebas que ni se tocan
// (visto en CI: el 6º registro de auth.test.ts caía en 429 y arrastraba el
// resto del test en cascada).
export function createTestApp() {
  return createApp();
}
