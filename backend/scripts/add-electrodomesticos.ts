// Restaura el departamento "Electrodomésticos" que ya estaba definido en
// prisma/seed.ts (TAXONOMY, sección Módulo 01) pero nunca quedó aplicado en
// staging — ver conversación del Módulo 03: 13 productos reales del Excel
// (licuadora, televisor, microondas, cafetera, procesador) no tenían dónde
// clasificarse sin esto. Idempotente (upsert por slug), re-ejecutable.
import { prisma } from "../src/config/prisma";

async function main() {
  // Sin subcategorías: el Excel no distingue subtipos de electrodoméstico
  // (licuadora, televisor, microondas... son solo 13 productos en total), así
  // que los productos se asignan directamente a este departamento — no hace
  // falta forzar un segundo nivel como en los demás departamentos.
  await prisma.category.upsert({
    where: { slug: "electrodomesticos" },
    update: { nombre: "Electrodomésticos", orden: 1 },
    create: {
      slug: "electrodomesticos",
      nombre: "Electrodomésticos",
      orden: 1,
      descripcion: "Licuadoras, televisores, microondas, cafeteras y otros electrodomésticos pequeños.",
    },
  });

  console.log("OK: categoría 'Electrodomésticos' creada/actualizada (slug: electrodomesticos).");
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
