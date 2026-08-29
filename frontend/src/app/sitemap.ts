import { MetadataRoute } from "next";
import { getCategoryTree, getCategoryProducts } from "@/services/catalogService";
import { CategoryNode } from "@/lib/api-types";
import { SITE_URL } from "@/lib/site";

function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children)]);
}

// Generado dinámicamente desde el catálogo real — nunca a mano — para que
// nunca quede desalineado con las categorías/productos activos (ver
// retail-seo-performance sección 4).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tree = await getCategoryTree().catch(() => []);
  const categories = flattenCategories(tree);

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/categoria/${category.slug}`,
    changeFrequency: "daily",
  }));

  const productSlugs = new Set<string>();
  await Promise.all(
    categories
      .filter((category) => category.children.length === 0)
      .map(async (category) => {
        try {
          const result = await getCategoryProducts(category.slug, { limit: 100 });
          for (const item of result.items) productSlugs.add(item.slug);
        } catch {
          // Categoría sin productos o API no disponible momentáneamente: se omite de este sitemap,
          // no rompe la generación del resto.
        }
      }),
  );

  const productEntries: MetadataRoute.Sitemap = Array.from(productSlugs).map((slug) => ({
    url: `${SITE_URL}/producto/${slug}`,
    changeFrequency: "weekly",
  }));

  return [{ url: SITE_URL, changeFrequency: "daily", priority: 1 }, ...categoryEntries, ...productEntries];
}
