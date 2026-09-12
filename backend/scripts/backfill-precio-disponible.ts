// CAT-02: backfill único de `products.precioDesde`/`disponible` para los
// productos ya importados antes de que existieran estas columnas. Después de
// esta corrida, el importador (import-catalog.ts) las mantiene al día en
// cada importación — este script no hace falta volver a correrlo salvo que
// se detecte que quedaron desalineadas (ej. un ajuste manual de stock por
// fuera del importador).
//
// Uso:
//   npm run backfill:precio-disponible

import { prisma } from "../src/config/prisma";

async function main() {
  const result = await prisma.$executeRaw`
    UPDATE products p
    SET "precioDesde" = sub.min_precio,
        disponible = sub.disponible
    FROM (
      SELECT
        pv."productId" AS product_id,
        MIN(pv.precio) AS min_precio,
        BOOL_OR(COALESCE(inv."cantidadDisponible", 0) > 0) AS disponible
      FROM product_variants pv
      LEFT JOIN inventory inv ON inv."variantId" = pv.id
      WHERE pv.activo = true
      GROUP BY pv."productId"
    ) sub
    WHERE p.id = sub.product_id;
  `;

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
