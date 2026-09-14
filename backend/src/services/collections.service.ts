import { minMoney, stockVendible } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";

export async function listCollections() {
  const collections = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { nombre: "asc" },
  });

  return collections.map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    tipo: c.tipo,
    totalProductos: c._count.products,
  }));
}

export async function listCollectionProducts(slug: string, pagination: PaginationParams) {
  const collection = await prisma.collection.findUnique({ where: { slug } });
  if (!collection) {
    throw AppError.notFound("COLLECTION_NOT_FOUND", `No existe la colección con slug '${slug}'.`);
  }

  const [links, total] = await Promise.all([
    prisma.productCollection.findMany({
      where: { collectionId: collection.id, product: { estado: "activo" } },
      include: {
        product: {
          include: {
            images: { orderBy: { orden: "asc" }, take: 1 },
            variants: { where: { activo: true }, select: { id: true, precio: true, inventory: true } },
          },
        },
      },
      // CAT-10: sin orderBy, Postgres no garantiza el mismo orden entre
      // páginas — productos podían repetirse o saltarse al paginar.
      orderBy: [{ product: { createdAt: "desc" } }, { productId: "asc" }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.productCollection.count({ where: { collectionId: collection.id, product: { estado: "activo" } } }),
  ]);

  const items = links.map(({ product }) => {
    // NUEVO-02/NUEVO-03: stock vendible (no cantidadDisponible sola) y
    // precioDesde como texto decimal fijo — mismo criterio que
    // products.service.ts.
    return {
      slug: product.slug,
      nombre: product.nombre,
      precioDesde: minMoney(product.variants.map((v) => v.precio.toString())),
      imagenPrincipal: product.images[0]?.url ?? null,
      varianteUnica:
        product.variants.length === 1
          ? { id: product.variants[0].id, disponible: stockVendible(product.variants[0].inventory) > 0 }
          : null,
    };
  });

  return buildPaginatedResult(items, total, pagination) as PaginatedResult<(typeof items)[number]>;
}
