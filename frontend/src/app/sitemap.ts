import { MetadataRoute } from "next";
import { getSitemapData } from "@/services/catalogService";
import { SITE_URL } from "@/lib/site";

// Generado dinámicamente desde el catálogo real — nunca a mano — para que
// nunca quede desalineado con las categorías/productos activos (ver
// retail-seo-performance sección 4).
//
// CAT-05: antes recorría el árbol de categorías en el propio frontend
// (solo categorías hoja, máximo 100 productos por categoría, sin
// `lastModified`). Ahora usa GET /api/sitemap, que devuelve TODAS las
// categorías con productos activos y TODOS los productos activos con su
// fecha real de actualización.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData().catch(() => ({ categorias: [], productos: [] }));

  const categoryEntries: MetadataRoute.Sitemap = data.categorias.map((category) => ({
    url: `${SITE_URL}/categoria/${category.slug}`,
    lastModified: new Date(category.updatedAt),
    changeFrequency: "daily",
  }));

  const productEntries: MetadataRoute.Sitemap = data.productos.map((product) => ({
    url: `${SITE_URL}/producto/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: "weekly",
  }));

  return [{ url: SITE_URL, changeFrequency: "daily", priority: 1 }, ...categoryEntries, ...productEntries];
}
