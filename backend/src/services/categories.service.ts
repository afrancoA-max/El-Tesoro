import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

export interface CategoryNode {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  orden: number;
  children: CategoryNode[];
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const [categories, productCounts] = await Promise.all([
    prisma.category.findMany({ orderBy: { orden: "asc" } }),
    prisma.product.groupBy({ by: ["categoriaId"], where: { estado: "activo" }, _count: true }),
  ]);

  const ownCountByCategory = new Map<string, number>(productCounts.map((c) => [c.categoriaId, c._count]));

  const nodesById = new Map<string, CategoryNode>(
    categories.map((category) => [
      category.id,
      {
        id: category.id,
        slug: category.slug,
        nombre: category.nombre,
        descripcion: category.descripcion,
        imagenUrl: category.imagenUrl,
        orden: category.orden,
        children: [],
      },
    ]),
  );

  const roots: CategoryNode[] = [];
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    const node = nodesById.get(category.id);
    if (!node) continue;
    if (category.parentId && nodesById.has(category.parentId)) {
      nodesById.get(category.parentId)!.children.push(node);
      const siblings = childrenByParent.get(category.parentId) ?? [];
      siblings.push(category.id);
      childrenByParent.set(category.parentId, siblings);
    } else {
      roots.push(node);
    }
  }

  // CAT-09: una categoría (o subcategoría) sin productos activos, propios o
  // heredados de sus hijas, no debe aparecer en el mega-menú ni en el
  // sitemap — es una página vacía para el visitante y para Google.
  function totalActiveProducts(categoryId: string): number {
    const own = ownCountByCategory.get(categoryId) ?? 0;
    const childrenIds = childrenByParent.get(categoryId) ?? [];
    return own + childrenIds.reduce((sum, childId) => sum + totalActiveProducts(childId), 0);
  }

  function pruneEmpty(nodes: CategoryNode[]): CategoryNode[] {
    return nodes
      .filter((node) => totalActiveProducts(node.id) > 0)
      .map((node) => ({ ...node, children: pruneEmpty(node.children) }));
  }

  return pruneEmpty(roots);
}

/// Devuelve la categoría solicitada junto con los ids de todas sus
/// categorías descendientes — un listado "por categoría" debe incluir
/// también los productos de sus subcategorías.
export async function getCategoryWithDescendantIds(
  slug: string,
): Promise<{ categoryId: string; descendantIds: string[] }> {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) {
    throw AppError.notFound("CATEGORY_NOT_FOUND", `No existe la categoría con slug '${slug}'.`);
  }

  const allCategories = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });

  const childrenByParent = new Map<string, string[]>();
  for (const c of allCategories) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c.id);
    childrenByParent.set(c.parentId, list);
  }

  const descendantIds: string[] = [];
  const queue = [category.id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childrenByParent.get(current) ?? [];
    for (const childId of children) {
      descendantIds.push(childId);
      queue.push(childId);
    }
  }

  return { categoryId: category.id, descendantIds };
}
