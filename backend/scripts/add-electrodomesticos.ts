// Restaura el departamento "Electrodomésticos": ya existía desde el Módulo
// 01 (creado 2026-08-28 por prisma/seed.ts) pero con su propio `parentId`
// apuntando a sí mismo — dato corrupto de aquel entonces que lo excluía en
// silencio de getCategoryTree (nunca entraba a `roots`) y hacía que
// getCategoryWithDescendantIds entrara en bucle infinito al consultarlo
// directamente (se registraba a sí mismo como su propio hijo). Diagnosticado
// en la conversación del Módulo 03 al ver un 503 constante en
// /api/categories/electrodomesticos/products. Forzar `parentId: null` es la
// corrección; idempotente, re-ejecutable.
import { prisma } from "../src/config/prisma";

async function main() {
  // Sin subcategorías: el Excel no distingue subtipos de electrodoméstico
  // (licuadora, televisor, microondas... son solo ~26 productos en total),
  // así que los productos se asignan directamente a este departamento — no
  // hace falta forzar un segundo nivel como en los demás departamentos.
  await prisma.category.upsert({
    where: { slug: "electrodomesticos" },
    update: { nombre: "Electrodomésticos", orden: 1, parentId: null },
    create: {
      slug: "electrodomesticos",
      nombre: "Electrodomésticos",
      orden: 1,
      parentId: null,
      descripcion: "Licuadoras, televisores, microondas, cafeteras y otros electrodomésticos pequeños.",
    },
  });

  console.log("OK: categoría 'Electrodomésticos' creada/actualizada (slug: electrodomesticos, parentId: null).");
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
