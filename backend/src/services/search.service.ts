import { prisma } from "../config/prisma";
import { normalizeText } from "../utils/normalizeText";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";

export interface SearchResultItem {
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  precioDesde: number | null;
  imagenPrincipal: string | null;
}

export async function searchProducts(
  query: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<SearchResultItem>> {
  const term = normalizeText(query);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where: { estado: "activo", busqueda: { contains: term } },
      include: {
        images: { orderBy: { orden: "asc" }, take: 1 },
        variants: { where: { activo: true }, select: { precio: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.product.count({ where: { estado: "activo", busqueda: { contains: term } } }),
  ]);

  const results: SearchResultItem[] = items.map((p) => {
    const precios = p.variants.map((v) => Number(v.precio));
    return {
      slug: p.slug,
      nombre: p.nombre,
      descripcionCorta: p.descripcionCorta,
      precioDesde: precios.length > 0 ? Math.min(...precios) : null,
      imagenPrincipal: p.images[0]?.url ?? null,
    };
  });

  return buildPaginatedResult(results, total, pagination);
}
