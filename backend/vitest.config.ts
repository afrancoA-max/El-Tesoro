import { defineConfig } from "vitest/config";

// INF-04: pruebas de integración contra Postgres real (nunca mocks — ver
// tests/setup.ts), por eso corren en serie (fileParallelism: false): varios
// archivos truncando las mismas tablas al mismo tiempo se pisarían entre sí.
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
