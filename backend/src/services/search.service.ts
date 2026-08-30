import { prisma } from "../config/prisma";
import { normalizeText } from "../utils/normalizeText";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";

export interface SearchResultItem {
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  precioDesde: number | null;
  imagenPrincipal: string | null;
  varianteUnica: { id: string; disponible: boolean } | null;
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
        variants: { where: { activo: true }, select: { id: true, precio: true, inventory: true } },
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
      varianteUnica:
        p.variants.length === 1
          ? { id: p.variants[0].id, disponible: (p.variants[0].inventory?.cantidadDisponible ?? 0) > 0 }
          : null,
    };
  });

  return buildPaginatedResult(results, total, pagination);
}
