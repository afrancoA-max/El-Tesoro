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
  const categories = await prisma.category.findMany({
    orderBy: { orden: "asc" },
  });

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
  for (const category of categories) {
    const node = nodesById.get(category.id);
    if (!node) continue;
    if (category.parentId && nodesById.has(category.parentId)) {
      nodesById.get(category.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
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
