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

  return {
    id: product.id,
    slug: product.slug,
    nombre: product.nombre,
    descripcionCorta: product.descripcionCorta,
    marca: product.marca,
    categoria: { slug: product.categoria.slug, nombre: product.categoria.nombre },
    precioDesde,
    disponible,
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

  const where: Prisma.ProductWhereInput = {
    estado: "activo",
    categoriaId: { in: [categoryId, ...descendantIds] },
    ...(filters.marca ? { marca: { equals: filters.marca, mode: "insensitive" } } : {}),
    ...(filters.precioMin !== undefined || filters.precioMax !== undefined
      ? {
          variants: {
            some: {
              activo: true,
              precio: {
                ...(filters.precioMin !== undefined ? { gte: filters.precioMin } : {}),
                ...(filters.precioMax !== undefined ? { lte: filters.precioMax } : {}),
              },
            },
          },
        }
      : {}),
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
      relatedFrom: { include: { relatedProduct: { include: { images: true, variants: true } } } },
    },
  });

  if (!product) {
    throw AppError.notFound("PRODUCT_NOT_FOUND", `No existe el producto con slug '${slug}'.`);
  }

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
    relacionados: product.relatedFrom.map((r) => ({
      slug: r.relatedProduct.slug,
      nombre: r.relatedProduct.nombre,
      tipo: r.tipo,
      imagenPrincipal: r.relatedProduct.images[0]?.url ?? null,
    })),
  };
}
