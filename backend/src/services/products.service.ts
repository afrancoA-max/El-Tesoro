import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { getCategoryWithDescendantIds } from "./categories.service";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";

export type ProductSort = "precio_asc" | "precio_desc" | "novedad";

export interface ProductListFilters {
  precioMin?: number;
  precioMax?: number;
  marca?: string;
  material?: string;
  disponible?: boolean;
  sort: ProductSort;
}

const productWithVariants = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    variants: {
      where: { activo: true },
      include: { inventory: true, images: true, atributos: { include: { attributeValue: { include: { attributeType: true } } } } },
    },
    images: { orderBy: { orden: "asc" } },
    categoria: true,
  },
});
type ProductWithVariants = Prisma.ProductGetPayload<typeof productWithVariants>;

function toSummary(product: ProductWithVariants) {
  const precios = product.variants.map((v) => Number(v.precio));
  const precioDesde = precios.length > 0 ? Math.min(...precios) : null;
  const disponible = product.variants.some((v) => (v.inventory?.cantidadDisponible ?? 0) > 0);
  const materiales = Array.from(
    new Set(
      product.variants.flatMap((v) =>
        v.atributos
          .filter((a) => a.attributeValue.attributeType.nombre === "Material")
          .map((a) => a.attributeValue.valor),
      ),
    ),
  );

  return {
    id: product.id,
    slug: product.slug,
    nombre: product.nombre,
    descripcionCorta: product.descripcionCorta,
    marca: product.marca,
    categoria: { slug: product.categoria.slug, nombre: product.categoria.nombre },
    precioDesde,
    disponible,
    // Vacío hoy para casi todo el catálogo: el importador de Excel (Módulo
    // 02) recién empezó a leer una columna "Material" opcional — ver
    // import-catalog.ts. El campo existe para que el filtro de material del
    // frontend funcione en cuanto haya datos, sin otro cambio de API.
    materiales,
    imagenPrincipal: product.images[0]?.url ?? product.variants[0]?.images?.[0]?.url ?? null,
    createdAt: product.createdAt,
  };
}

export async function listProductsByCategory(
  categorySlug: string,
  filters: ProductListFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<ReturnType<typeof toSummary>>> {
  const { categoryId, descendantIds } = await getCategoryWithDescendantIds(categorySlug);

  // Cada condición sobre `variants` va en su propia entrada de `AND`: usar
  // varias claves `variants` en el mismo objeto se pisarían entre sí (el
  // filtro de precio y el de material son condiciones independientes, no
  // deben exigirse ambas sobre la MISMA variante necesariamente, pero sí
  // deben combinarse — objeto spread con la misma key solo deja la última).
  const variantConditions: Prisma.ProductWhereInput[] = [];

  if (filters.material) {
    variantConditions.push({
      variants: {
        some: {
          activo: true,
          atributos: {
            some: {
              attributeValue: {
                valor: { equals: filters.material, mode: "insensitive" },
                attributeType: { nombre: "Material" },
              },
            },
          },
        },
      },
    });
  }

  if (filters.precioMin !== undefined || filters.precioMax !== undefined) {
    variantConditions.push({
      variants: {
        some: {
          activo: true,
          precio: {
            ...(filters.precioMin !== undefined ? { gte: filters.precioMin } : {}),
            ...(filters.precioMax !== undefined ? { lte: filters.precioMax } : {}),
          },
        },
      },
    });
  }

  const where: Prisma.ProductWhereInput = {
    estado: "activo",
    categoriaId: { in: [categoryId, ...descendantIds] },
    ...(filters.marca ? { marca: { equals: filters.marca, mode: "insensitive" } } : {}),
    ...(variantConditions.length > 0 ? { AND: variantConditions } : {}),
  };

  // El catálogo de este módulo es pequeño (importador filtra a productos con
  // precio real, ver docs/plan/02-api-catalogo.md); se ordena/pagina en
  // memoria para poder ordenar por "precio desde" (mínimo entre variantes),
  // algo que Prisma no soporta como orderBy de agregación en relaciones
  // to-many. Si el catálogo crece sustancialmente, denormalizar precioDesde
  // en products sería el siguiente paso.
  const allMatching = await prisma.product.findMany({ where, ...productWithVariants });

  const filtered =
    filters.disponible === undefined
      ? allMatching
      : allMatching.filter(
          (p) => p.variants.some((v) => (v.inventory?.cantidadDisponible ?? 0) > 0) === filters.disponible,
        );

  const summaries = filtered.map(toSummary);

  summaries.sort((a, b) => {
    if (filters.sort === "precio_asc") return (a.precioDesde ?? 0) - (b.precioDesde ?? 0);
    if (filters.sort === "precio_desc") return (b.precioDesde ?? 0) - (a.precioDesde ?? 0);
    return b.createdAt.getTime() - a.createdAt.getTime(); // novedad
  });

  const total = summaries.length;
  const page = summaries.slice(pagination.skip, pagination.skip + pagination.limit);

  return buildPaginatedResult(page, total, pagination);
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      categoria: true,
      images: { orderBy: { orden: "asc" } },
      variants: {
        include: {
          images: { orderBy: { orden: "asc" } },
          inventory: true,
          atributos: { include: { attributeValue: { include: { attributeType: true } } } },
        },
      },
      relatedFrom: { include: { relatedProduct: { ...productWithVariants } } },
    },
  });

  if (!product) {
    throw AppError.notFound("PRODUCT_NOT_FOUND", `No existe el producto con slug '${slug}'.`);
  }

  // Nadie ha curado relaciones todavía (tabla ProductRelation vacía en la
  // práctica — no hay panel admin para eso, ver Módulo 08), así que caemos a
  // "otros productos de la misma categoría" para que la sección de
  // relacionados no quede vacía mientras tanto. Misma forma que el listado
  // de categoría (toSummary) para que ProductCard los renderice igual.
  const relacionados =
    product.relatedFrom.length > 0
      ? product.relatedFrom.map((r) => toSummary(r.relatedProduct))
      : (
          await prisma.product.findMany({
            where: { estado: "activo", categoriaId: product.categoriaId, id: { not: product.id } },
            take: 8,
            orderBy: { createdAt: "desc" },
            ...productWithVariants,
          })
        ).map(toSummary);

  return {
    id: product.id,
    slug: product.slug,
    nombre: product.nombre,
    descripcionCorta: product.descripcionCorta,
    descripcionLarga: product.descripcionLarga,
    marca: product.marca,
    especificaciones: product.especificaciones,
    estado: product.estado,
    categoria: { slug: product.categoria.slug, nombre: product.categoria.nombre },
    imagenes: product.images.map((img) => ({ url: img.url, textoAlternativo: img.textoAlternativo, orden: img.orden })),
    variantes: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      precio: v.precio,
      precioComparativo: v.precioComparativo,
      activo: v.activo,
      disponible: (v.inventory?.cantidadDisponible ?? 0) > 0,
      atributos: v.atributos.map((a) => ({
        tipo: a.attributeValue.attributeType.nombre,
        valor: a.attributeValue.valor,
      })),
      imagenes: v.images.map((img) => img.url),
    })),
    relacionados,
  };
}
