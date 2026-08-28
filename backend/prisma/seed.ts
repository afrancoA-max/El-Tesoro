// Seed de Módulo 01: carga la taxonomía real del negocio (Categorías.xlsx)
// agrupada en una jerarquía DRAFT de 2 niveles (departamento > categoría),
// y un producto de prueba con 2 variantes y 3 imágenes para verificar que
// el esquema soporta el caso completo sin migraciones adicionales.
//
// La taxonomía NO está aprobada por el dueño del negocio todavía — ver
// docs/plan/01-fundacional.md, sección "Riesgos y decisiones pendientes".
// Este seed es reproducible (upsert por slug) para poder re-ejecutarlo
// cuando la jerarquía real se confirme.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Jerarquía DRAFT propuesta por Claude Code a partir de las 25 categorías
// reales en Categorías.xlsx. Pendiente de aprobación del dueño del negocio.
const TAXONOMY: Array<{ nombre: string; hijas: string[] }> = [
  {
    nombre: "Cocina y Cocción",
    hijas: [
      "Acero Fundido",
      "Acero Inoxidable",
      "Aluminio",
      "Peltre",
      "Peltre Chino",
      "Peltre Mexicano",
      "Teflon",
    ],
  },
  {
    nombre: "Electrodomésticos",
    hijas: ["Electrodomesticos"],
  },
  {
    nombre: "Cristalería y Menaje de Mesa",
    hijas: ["Cristaleria", "China", "Cubiertos", "Melamina", "Acrilico", "Plastico"],
  },
  {
    nombre: "Bar y Barista",
    hijas: ["Bar", "Barista", "Hieleras", "Thermos"],
  },
  {
    nombre: "Repostería y Cocina Auxiliar",
    hijas: ["Reposteria", "Coladores", "Cuchillos"],
  },
  {
    nombre: "Hogar y Varios",
    hijas: ["Lavado", "Merceria", "Tienda", "Varios"],
  },
];

async function seedTaxonomy() {
  let departamentoOrden = 0;
  for (const departamento of TAXONOMY) {
    const parent = await prisma.category.upsert({
      where: { slug: slugify(departamento.nombre) },
      update: { nombre: departamento.nombre, orden: departamentoOrden },
      create: {
        slug: slugify(departamento.nombre),
        nombre: departamento.nombre,
        orden: departamentoOrden,
        descripcion: `Departamento propuesto (draft, sin aprobar) que agrupa: ${departamento.hijas.join(", ")}.`,
      },
    });

    let categoriaOrden = 0;
    for (const nombreHija of departamento.hijas) {
      await prisma.category.upsert({
        where: { slug: slugify(nombreHija) },
        update: { nombre: nombreHija, orden: categoriaOrden, parentId: parent.id },
        create: {
          slug: slugify(nombreHija),
          nombre: nombreHija,
          orden: categoriaOrden,
          parentId: parent.id,
        },
      });
      categoriaOrden += 1;
    }
    departamentoOrden += 1;
  }
}

async function seedSampleProduct() {
  const categoria = await prisma.category.findUniqueOrThrow({
    where: { slug: "teflon" },
  });

  const tamano = await prisma.attributeType.upsert({
    where: { nombre: "Tamaño" },
    update: {},
    create: { nombre: "Tamaño" },
  });
  const color = await prisma.attributeType.upsert({
    where: { nombre: "Color" },
    update: {},
    create: { nombre: "Color" },
  });

  const tamano24 = await prisma.attributeValue.upsert({
    where: { attributeTypeId_valor: { attributeTypeId: tamano.id, valor: "24cm" } },
    update: {},
    create: { attributeTypeId: tamano.id, valor: "24cm" },
  });
  const tamano28 = await prisma.attributeValue.upsert({
    where: { attributeTypeId_valor: { attributeTypeId: tamano.id, valor: "28cm" } },
    update: {},
    create: { attributeTypeId: tamano.id, valor: "28cm" },
  });
  const negro = await prisma.attributeValue.upsert({
    where: { attributeTypeId_valor: { attributeTypeId: color.id, valor: "Negro" } },
    update: {},
    create: { attributeTypeId: color.id, valor: "Negro" },
  });

  const product = await prisma.product.upsert({
    where: { slug: "sarten-antiadherente-chef" },
    update: {},
    create: {
      slug: "sarten-antiadherente-chef",
      nombre: "Sartén antiadherente línea Chef",
      descripcionCorta: "Sartén antiadherente de uso diario, apta para todo tipo de estufas.",
      descripcionLarga: "Producto de prueba del Módulo 01 para validar el esquema de catálogo (producto + variantes + imágenes + atributos + inventario).",
      categoriaId: categoria.id,
      marca: "El Tesoro",
      estado: "activo",
      especificaciones: { apto_induccion: false, material_recubrimiento: "teflon" },
      // Campos B2B latentes: sin uso todavía (módulo 11), solo demuestran
      // que existen desde el modelo base.
      precioMayorista: "89.00",
      cantidadMinimaMayorista: 12,
    },
  });

  const productImage = await prisma.productImage.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      productId: product.id,
      url: "https://placehold.co/800x800?text=Sarten+Chef",
      orden: 0,
      textoAlternativo: "Sartén antiadherente línea Chef, vista general",
    },
  });

  const variant24 = await prisma.productVariant.upsert({
    where: { sku: "SART-CHEF-24-NEG" },
    update: {},
    create: {
      sku: "SART-CHEF-24-NEG",
      productId: product.id,
      precio: "129.00",
      precioComparativo: "149.00",
      pesoKg: "0.850",
      activo: true,
    },
  });

  const variant28 = await prisma.productVariant.upsert({
    where: { sku: "SART-CHEF-28-NEG" },
    update: {},
    create: {
      sku: "SART-CHEF-28-NEG",
      productId: product.id,
      precio: "149.00",
      pesoKg: "1.050",
      activo: true,
    },
  });

  await prisma.variantAttributeValue.createMany({
    data: [
      { variantId: variant24.id, attributeValueId: tamano24.id },
      { variantId: variant24.id, attributeValueId: negro.id },
      { variantId: variant28.id, attributeValueId: tamano28.id },
      { variantId: variant28.id, attributeValueId: negro.id },
    ],
    skipDuplicates: true,
  });

  const image24 = await prisma.productImage.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      variantId: variant24.id,
      url: "https://placehold.co/800x800?text=Sarten+24cm",
      orden: 0,
      textoAlternativo: "Sartén antiadherente línea Chef, 24cm, negro",
    },
  });

  const image28 = await prisma.productImage.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000003",
      variantId: variant28.id,
      url: "https://placehold.co/800x800?text=Sarten+28cm",
      orden: 0,
      textoAlternativo: "Sartén antiadherente línea Chef, 28cm, negro",
    },
  });

  await prisma.productVariant.update({
    where: { id: variant24.id },
    data: { imagenPrincipalId: image24.id },
  });
  await prisma.productVariant.update({
    where: { id: variant28.id },
    data: { imagenPrincipalId: image28.id },
  });

  await prisma.inventory.upsert({
    where: { variantId: variant24.id },
    update: {},
    create: { variantId: variant24.id, cantidadDisponible: 15, umbralStockBajo: 3 },
  });
  await prisma.inventory.upsert({
    where: { variantId: variant28.id },
    update: {},
    create: { variantId: variant28.id, cantidadDisponible: 8, umbralStockBajo: 3 },
  });

  void productImage;
}

async function main() {
  await seedTaxonomy();
  await seedSampleProduct();
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
