import { prisma } from "../config/prisma";

/// Mismo algoritmo que `scripts/import-catalog.ts` (slugify) — movido aquí
/// para que el panel admin (Módulo 08) y el importador compartan una sola
/// implementación en vez de dos copias que puedan divergir.
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/// Agrega un sufijo numérico estable si el slug ya existe en otro producto.
/// `excludeId` evita que un producto choque consigo mismo al reeditar su
/// propio nombre.
export async function ensureUniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base || "producto";
  let suffix = 2;
  while (await prisma.product.findFirst({ where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function ensureUniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base || "categoria";
  let suffix = 2;
  while (await prisma.category.findFirst({ where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
