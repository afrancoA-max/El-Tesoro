import { apiGet } from "./api";
import {
  BannerSummary,
  CategoryFacets,
  CategoryNode,
  PaginatedProducts,
  PaginatedSearch,
  ProductDetail,
  ProductQueryParams,
  SitemapData,
} from "@/lib/api-types";

export function getCategoryTree(): Promise<CategoryNode[]> {
  return apiGet<CategoryNode[]>("/categories");
}

export function getCategoryProducts(slug: string, params: ProductQueryParams = {}): Promise<PaginatedProducts> {
  return apiGet<PaginatedProducts>(`/categories/${slug}/products`, {
    page: params.page,
    limit: params.limit,
    precioMin: params.precioMin,
    precioMax: params.precioMax,
    marca: params.marca,
    material: params.material,
    disponible: params.disponible,
    sort: params.sort,
  });
}

export function getProduct(slug: string): Promise<ProductDetail> {
  return apiGet<ProductDetail>(`/products/${slug}`);
}

// CAT-03: facetas (marcas/materiales/rango de precio) calculadas en el
// backend sobre TODOS los productos activos de la categoría — reemplaza el
// cálculo en el frontend sobre los primeros 100 productos del listado.
export function getCategoryFacets(slug: string): Promise<CategoryFacets> {
  return apiGet<CategoryFacets>(`/categories/${slug}/facets`);
}

export function searchProducts(query: string, params: { page?: number; limit?: number } = {}): Promise<PaginatedSearch> {
  return apiGet<PaginatedSearch>("/search", { q: query, page: params.page, limit: params.limit });
}

// CAT-05: todas las categorías con productos activos y todos los productos
// activos, en una sola llamada — reemplaza el recorrido manual del sitemap
// que solo cubría categorías hoja y 100 productos por categoría.
export function getSitemapData(): Promise<SitemapData> {
  return apiGet<SitemapData>("/sitemap");
}

// CAT-06: banners administrados a mano (npm run manage-banners), sin panel
// admin. Vacío cuando no hay ninguno configurado o vigente — el home cae a
// su selección automática por categoría en ese caso.
export function getBanners(): Promise<BannerSummary[]> {
  return apiGet<BannerSummary[]>("/banners");
}

// Encuentra el nodo (departamento o categoría hoja) que coincide con un slug,
// buscando en todo el árbol — necesario porque tanto `/categoria/[dept]` como
// `/categoria/[hoja]` son rutas válidas de un solo segmento.
export function findCategoryBySlug(tree: CategoryNode[], slug: string): CategoryNode | undefined {
  for (const node of tree) {
    if (node.slug === slug) return node;
    const found = findCategoryBySlug(node.children, slug);
    if (found) return found;
  }
  return undefined;
}

// Ruta de breadcrumbs (departamento > ... > nodo) hasta el slug dado.
export function findCategoryPath(tree: CategoryNode[], slug: string, trail: CategoryNode[] = []): CategoryNode[] | undefined {
  for (const node of tree) {
    const nextTrail = [...trail, node];
    if (node.slug === slug) return nextTrail;
    const found = findCategoryPath(node.children, slug, nextTrail);
    if (found) return found;
  }
  return undefined;
}
