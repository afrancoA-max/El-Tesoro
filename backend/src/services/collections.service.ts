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
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.productCollection.count({ where: { collectionId: collection.id, product: { estado: "activo" } } }),
  ]);

  const items = links.map(({ product }) => {
    const precios = product.variants.map((v) => Number(v.precio));
    return {
      slug: product.slug,
      nombre: product.nombre,
      precioDesde: precios.length > 0 ? Math.min(...precios) : null,
      imagenPrincipal: product.images[0]?.url ?? null,
      varianteUnica:
        product.variants.length === 1
          ? { id: product.variants[0].id, disponible: (product.variants[0].inventory?.cantidadDisponible ?? 0) > 0 }
          : null,
    };
  });

  return buildPaginatedResult(items, total, pagination) as PaginatedResult<(typeof items)[number]>;
}
