import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizeText } from "../utils/normalizeText";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";
import { getCategoryWithDescendantIds } from "./categories.service";

export interface StaffInventoryItem {
  variantId: string;
  sku: string;
  productoNombre: string;
  productoSlug: string;
  marca: string | null;
  categoria: string;
  atributos: string;
  imagen: string | null;
  precio: number;
  cantidadDisponible: number;
  cantidadReservada: number;
  umbralStockBajo: number;
}

const STAFF_VARIANT_INCLUDE = {
  product: { include: { categoria: true } },
  imagenPrincipal: true,
  inventory: true,
  atributos: { include: { attributeValue: { include: { attributeType: true } } } },
} satisfies Prisma.ProductVariantInclude;

type StaffVariant = Prisma.ProductVariantGetPayload<{ include: typeof STAFF_VARIANT_INCLUDE }>;

function toStaffInventoryItem(v: StaffVariant): StaffInventoryItem {
  return {
    variantId: v.id,
    sku: v.sku,
    productoNombre: v.product.nombre,
    productoSlug: v.product.slug,
    marca: v.product.marca,
    categoria: v.product.categoria.nombre,
    atributos: v.atributos.map((a) => `${a.attributeValue.attributeType.nombre}: ${a.attributeValue.valor}`).join(" · "),
    imagen: v.imagenPrincipal?.url ?? null,
    precio: Number(v.precio),
    cantidadDisponible: v.inventory?.cantidadDisponible ?? 0,
    cantidadReservada: v.inventory?.cantidadReservada ?? 0,
    umbralStockBajo: v.inventory?.umbralStockBajo ?? 0,
  };
}

/// Búsqueda para personal interno: a diferencia de `search.service.ts`
/// (público, solo expone disponible: boolean), esta devuelve cantidades
/// exactas por variante — el vendedor necesita el número real, no solo si
/// hay o no hay.
export async function searchStaffInventory(
  query: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<StaffInventoryItem>> {
  const term = normalizeText(query);

  const where = {
    activo: true,
    OR: [{ sku: { contains: term, mode: "insensitive" as const } }, { product: { busqueda: { contains: term } } }],
  };

  const [variants, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      include: STAFF_VARIANT_INCLUDE,
      orderBy: { updatedAt: "desc" },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.productVariant.count({ where }),
  ]);

  return buildPaginatedResult(variants.map(toStaffInventoryItem), total, pagination);
}

/// Listado por categoría para el modo "explorar" (drop down de categorías en
/// vez de escribir una búsqueda) — incluye subcategorías del slug dado, en
/// orden alfabético por nombre de producto.
export async function listStaffInventoryByCategory(
  categorySlug: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<StaffInventoryItem>> {
  const { categoryId, descendantIds } = await getCategoryWithDescendantIds(categorySlug);
  const where = {
    activo: true,
    product: { categoriaId: { in: [categoryId, ...descendantIds] } },
  };

  const [variants, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      include: STAFF_VARIANT_INCLUDE,
      orderBy: { product: { nombre: "asc" } },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.productVariant.count({ where }),
  ]);

  return buildPaginatedResult(variants.map(toStaffInventoryItem), total, pagination);
}
