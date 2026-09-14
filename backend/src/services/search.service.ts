import { Prisma } from "@prisma/client";
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
  // Un `q` de puros espacios pasa el min(2) del validador pero normaliza a
  // cero palabras — sin este corte, `wordConditions` de abajo quedaría
  // vacío y el SQL crudo armado a mano rompería (antes, con la API fluida
  // de Prisma, `AND: []` simplemente no filtraba nada).
  if (words.length === 0) {
    return buildPaginatedResult([], 0, pagination);
  }
  const normalizedQuery = words.join(" ");
  const where = {
    estado: "activo" as const,
    AND: words.map((word) => ({ busqueda: { contains: word } })),
  };

  // NUEVO-06: `orderBy: [{ busqueda: "asc" }, ...]` ordenaba alfabético —
  // el comentario decía "coincidencia al inicio primero", que no es lo que
  // hacía (los resultados eran correctos, solo el orden entre ellos no).
  // Relevancia real y barata sin motor de búsqueda dedicado: primero los
  // productos cuyo texto normalizado EMPIEZA con lo buscado, luego el resto
  // por novedad. Prisma no expresa un ORDER BY condicional por su API
  // fluida, así que se resuelve el orden de ids con SQL crudo (parametrizado
  // vía Prisma.sql — nunca concatenando el término del usuario) y se cargan
  // los datos completos después, respetando ese orden.
  const wordConditions = Prisma.join(
    words.map((word) => Prisma.sql`busqueda LIKE ${`%${word}%`}`),
    " AND ",
  );

  const [orderedIds, total] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM products
      WHERE estado = 'activo' AND ${wordConditions}
      ORDER BY (busqueda LIKE ${`${normalizedQuery}%`}) DESC, "createdAt" DESC
      LIMIT ${pagination.limit} OFFSET ${pagination.skip}
    `),
    prisma.product.count({ where }),
  ]);

  const idsInOrder = orderedIds.map((row) => row.id);
  const itemsById = new Map(
    (
      await prisma.product.findMany({
        where: { id: { in: idsInOrder } },
        include: {
          images: { orderBy: { orden: "asc" }, take: 1 },
          variants: { where: { activo: true }, select: { id: true, precio: true, inventory: true } },
        },
      })
    ).map((p) => [p.id, p]),
  );
  const items = idsInOrder.map((id) => itemsById.get(id)).filter((p): p is NonNullable<typeof p> => p !== undefined);

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
