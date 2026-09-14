import { Prisma } from "@prisma/client";
import { minMoney, stockVendible } from "@el-tesoro/shared";
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
  // NUEVO-03: texto decimal fijo ("129.99"), igual que el resto de la API de
  // dinero (carrito, ficha) — antes salía como `number` (Math.min sobre
  // Number(precio)), el único endpoint de catálogo que rompía esa regla.
  const precioDesde = minMoney(product.variants.map((v) => v.precio.toString()));
  // NUEVO-02: stock vendible, no cantidadDisponible sola — ver
  // shared/src/inventory.ts.
  const disponible = product.variants.some((v) => stockVendible(v.inventory) > 0);
  const materiales = Array.from(
    new Set(
      product.variants.flatMap((v) =>
        v.atributos
          .filter((a) => a.attributeValue.attributeType.nombre === "Material")
          .map((a) => a.attributeValue.valor),
      ),
    ),
  );

  // Solo cuando el producto tiene exactamente una variante (sin selector de
  // Talla/Color/etc.) se puede agregar al carrito directo desde la tarjeta,
  // sin pasar por la ficha — ver docs/plan/05-carrito.md punto 2. Con más de
  // una variante, la tarjeta no tiene forma de saber cuál eligió el cliente.
  const varianteUnica =
    product.variants.length === 1
      ? { id: product.variants[0].id, disponible: stockVendible(product.variants[0].inventory) > 0 }
      : null;

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
    varianteUnica,
    createdAt: product.createdAt,
  };
}

// CAT-02: `precioDesde`/`disponible` son las columnas desnormalizadas en
// `products` (mantenidas por el importador, ver import-catalog.ts) — permiten
// filtrar, ordenar y paginar en SQL sin cargar el catálogo completo de la
// categoría en memoria en cada request.
function buildProductListWhere(
  categoryId: string,
  descendantIds: string[],
  filters: ProductListFilters,
): Prisma.ProductWhereInput {
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

  return {
    estado: "activo",
    categoriaId: { in: [categoryId, ...descendantIds] },
    ...(filters.marca ? { marca: { equals: filters.marca, mode: "insensitive" } } : {}),
    ...(filters.disponible !== undefined ? { disponible: filters.disponible } : {}),
    ...(filters.precioMin !== undefined || filters.precioMax !== undefined
      ? {
          precioDesde: {
            ...(filters.precioMin !== undefined ? { gte: filters.precioMin } : {}),
            ...(filters.precioMax !== undefined ? { lte: filters.precioMax } : {}),
          },
        }
      : {}),
    ...(variantConditions.length > 0 ? { AND: variantConditions } : {}),
  };
}

export async function listProductsByCategory(
  categorySlug: string,
  filters: ProductListFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<ReturnType<typeof toSummary>>> {
  const { categoryId, descendantIds } = await getCategoryWithDescendantIds(categorySlug);
  const where = buildProductListWhere(categoryId, descendantIds, filters);

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "precio_asc"
      ? { precioDesde: "asc" }
      : filters.sort === "precio_desc"
        ? { precioDesde: "desc" }
        : { createdAt: "desc" }; // novedad

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
      ...productWithVariants,
    }),
    prisma.product.count({ where }),
  ]);

  return buildPaginatedResult(items.map(toSummary), total, pagination);
}

export interface CategoryFacets {
  marcas: string[];
  materiales: string[];
  // NUEVO-03: texto decimal fijo, igual que `precioDesde` en el listado —
  // antes salían como `number` (único rincón de las facetas con ese tipo).
  precioMin: string | null;
  precioMax: string | null;
}

// CAT-02/CAT-03: antes las facetas (marcas, materiales) se calculaban en el
// frontend a partir de los primeros 100 productos del listado paginado — si
// la categoría tenía más, faltaban marcas. Este endpoint las calcula con
// `groupBy`/`aggregate` sobre TODOS los productos activos de la categoría
// (y sus subcategorías), independiente de la paginación.
export async function getCategoryFacets(categorySlug: string): Promise<CategoryFacets> {
  const { categoryId, descendantIds } = await getCategoryWithDescendantIds(categorySlug);
  const categoriaId = { in: [categoryId, ...descendantIds] };

  const [marcasGroup, materiales, precioAgg] = await Promise.all([
    prisma.product.groupBy({
      by: ["marca"],
      where: { estado: "activo", categoriaId, marca: { not: null } },
    }),
    prisma.attributeValue.findMany({
      where: {
        attributeType: { nombre: "Material" },
        variants: { some: { variant: { activo: true, product: { estado: "activo", categoriaId } } } },
      },
      select: { valor: true },
      distinct: ["valor"],
    }),
    prisma.product.aggregate({
      where: { estado: "activo", categoriaId },
      _min: { precioDesde: true },
      _max: { precioDesde: true },
    }),
  ]);

  return {
    marcas: marcasGroup.map((g) => g.marca).filter((m): m is string => Boolean(m)).sort(),
    materiales: materiales.map((m) => m.valor).sort(),
    // .toFixed(2), no .toString(): decimal.js recorta ceros de cola.
    precioMin: precioAgg._min.precioDesde?.toFixed(2) ?? null,
    precioMax: precioAgg._max.precioDesde?.toFixed(2) ?? null,
  };
}

export async function getProductBySlug(slug: string) {
  // CAT-01: un slug en borrador/descontinuado no debe responder 200 (Google
  // lo indexaría y la ficha mostraría variantes que luego fallan al
  // agregarlas al carrito) — findFirst en vez de findUnique porque
  // necesitamos combinar el slug con el filtro de estado.
  const product = await prisma.product.findFirst({
    where: { slug, estado: "activo" },
    include: {
      categoria: true,
      images: { orderBy: { orden: "asc" } },
      variants: {
        where: { activo: true },
        include: {
          images: { orderBy: { orden: "asc" } },
          inventory: true,
          atributos: { include: { attributeValue: { include: { attributeType: true } } } },
        },
      },
      relatedFrom: {
        where: { relatedProduct: { estado: "activo" } },
        include: { relatedProduct: { ...productWithVariants } },
      },
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
  const RELACIONADOS_MAX = 7;
  const relacionados =
    product.relatedFrom.length > 0
      ? product.relatedFrom.slice(0, RELACIONADOS_MAX).map((r) => toSummary(r.relatedProduct))
      : (
          await prisma.product.findMany({
            where: { estado: "activo", categoriaId: product.categoriaId, id: { not: product.id } },
            take: RELACIONADOS_MAX,
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
      // .toFixed(2), no la Decimal cruda: su toJSON usa toString(), que
      // recorta ceros de cola ("150" en vez de "150.00").
      precio: v.precio.toFixed(2),
      precioComparativo: v.precioComparativo?.toFixed(2) ?? null,
      activo: v.activo,
      disponible: stockVendible(v.inventory) > 0,
      // CAR-03/NUEVO-02: la ficha necesita el stock VENDIBLE real (no solo
      // el booleano `disponible`, y no cantidadDisponible sola una vez que
      // existan reservas) para el selector de cantidad de 1 a min(stock, 99).
      stockDisponible: stockVendible(v.inventory),
      atributos: v.atributos.map((a) => ({
        tipo: a.attributeValue.attributeType.nombre,
        valor: a.attributeValue.valor,
      })),
      imagenes: v.images.map((img) => img.url),
    })),
    relacionados,
  };
}
