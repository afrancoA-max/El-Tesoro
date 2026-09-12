import { prisma } from "../config/prisma";
import { normalizeText } from "../utils/normalizeText";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";

export interface SearchResultItem {
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  marca: string | null;
  precioDesde: number | null;
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
    const precios = p.variants.map((v) => Number(v.precio));
    return {
      slug: p.slug,
      nombre: p.nombre,
      descripcionCorta: p.descripcionCorta,
      marca: p.marca,
      precioDesde: precios.length > 0 ? Math.min(...precios) : null,
      disponible: p.variants.some((v) => (v.inventory?.cantidadDisponible ?? 0) > 0),
      imagenPrincipal: p.images[0]?.url ?? null,
      varianteUnica:
        p.variants.length === 1
          ? { id: p.variants[0].id, disponible: (p.variants[0].inventory?.cantidadDisponible ?? 0) > 0 }
          : null,
    };
  });

  return buildPaginatedResult(results, total, pagination);
}
