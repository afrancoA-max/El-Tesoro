import { prisma } from "../config/prisma";

export interface SitemapEntry {
  slug: string;
  updatedAt: Date;
}

export interface SitemapData {
  categorias: SitemapEntry[];
  productos: SitemapEntry[];
}

// CAT-05: el sitemap del frontend recorría solo categorías hoja y hasta 100
// productos por categoría (reutilizando el endpoint de listado, pensado para
// paginar, no para exportar todo). Este endpoint devuelve TODAS las
// categorías con al menos un producto activo (propio o heredado de una
// subcategoría, mismo criterio que CAT-09) y TODOS los productos activos,
// cada uno con su `updatedAt` real.
export async function getSitemapData(): Promise<SitemapData> {
  const [categories, productCounts, products] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true, parentId: true, updatedAt: true } }),
    prisma.product.groupBy({ by: ["categoriaId"], where: { estado: "activo" }, _count: true }),
    prisma.product.findMany({ where: { estado: "activo" }, select: { slug: true, updatedAt: true } }),
  ]);

  const ownCountByCategory = new Map(productCounts.map((c) => [c.categoriaId, c._count]));
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = childrenByParent.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenByParent.set(category.parentId, siblings);
  }

  function totalActiveProducts(categoryId: string): number {
    const own = ownCountByCategory.get(categoryId) ?? 0;
    const childrenIds = childrenByParent.get(categoryId) ?? [];
    return own + childrenIds.reduce((sum, childId) => sum + totalActiveProducts(childId), 0);
  }

  const categorias = categories
    .filter((category) => totalActiveProducts(category.id) > 0)
    .map((category) => ({ slug: category.slug, updatedAt: category.updatedAt }));

  return {
    categorias,
    productos: products.map((product) => ({ slug: product.slug, updatedAt: product.updatedAt })),
  };
}
