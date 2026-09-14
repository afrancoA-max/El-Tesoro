// CAT-02/NUEVO-01: backfill único de `products.precioDesde`/`disponible`
// para los productos ya importados antes de que existieran estas columnas.
// Desde la migración 20260914090000_nuevo01_trigger_agregados_producto, un
// trigger de Postgres las mantiene al día automáticamente en cada cambio de
// precio/inventario (no solo el importador) — este script ya no hace falta
// para uso normal, se deja como herramienta de reparación manual si alguna
// vez se sospecha desalineación (ej. un UPDATE directo en la base que haya
// esquivado el trigger).
//
// Uso:
//   npm run backfill:precio-disponible

import { prisma } from "../src/config/prisma";

async function main() {
  const result = await prisma.$executeRaw`SELECT refresh_product_aggregates(id) FROM products`;

  console.log(`Productos actualizados: ${result}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
