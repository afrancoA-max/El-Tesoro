import { minMoney, stockVendible } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { normalizeText } from "../utils/normalizeText";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";

export interface SearchResultItem {
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  marca: string | null;
  // NUEVO-03: texto decimal fijo, igual que el listado de categoría.
  precioDesde: string | null;
  disponible: boolean;
  imagenPrincipal: string | null;
  varianteUnica: { id: string; disponible: boolean } | null;
}

export async function searchProducts(
  query: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<SearchResultItem>> {
  // CAT-04: buscar la frase completa como substring hace que el orden de las
  // palabras importe ("olla presto" encuentra, "presto olla" no). Se busca
  // cada palabra por separado y se exige que todas aparezcan (en cualquier
  // orden) con un AND de `contains`.
  const words = normalizeText(query)
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const where = {
    estado: "activo" as const,
    AND: words.map((word) => ({ busqueda: { contains: word } })),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { orden: "asc" }, take: 1 },
        variants: { where: { activo: true }, select: { id: true, precio: true, inventory: true } },
      },
      // Relevancia simple: coincidencia al inicio del texto de búsqueda
      // primero (más probable que sea el producto buscado), luego por
      // novedad. Sin un motor de búsqueda dedicado, es la mejor señal barata
      // disponible con `contains`.
      orderBy: [{ busqueda: "asc" }, { createdAt: "desc" }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.product.count({ where }),
  ]);

  const results: SearchResultItem[] = items.map((p) => {
    return {
      slug: p.slug,
      nombre: p.nombre,
      descripcionCorta: p.descripcionCorta,
      marca: p.marca,
      precioDesde: minMoney(p.variants.map((v) => v.precio.toString())),
      disponible: p.variants.some((v) => stockVendible(v.inventory) > 0),
      imagenPrincipal: p.images[0]?.url ?? null,
      varianteUnica:
        p.variants.length === 1
          ? { id: p.variants[0].id, disponible: stockVendible(p.variants[0].inventory) > 0 }
          : null,
    };
  });

  return buildPaginatedResult(results, total, pagination);
}
