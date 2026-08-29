import { apiGet } from "./api";
import {
  CategoryNode,
  PaginatedProducts,
  PaginatedSearch,
  ProductDetail,
  ProductQueryParams,
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
    disponible: params.disponible,
    sort: params.sort,
  });
}

export function getProduct(slug: string): Promise<ProductDetail> {
  return apiGet<ProductDetail>(`/products/${slug}`);
}

export function searchProducts(query: string, params: { page?: number; limit?: number } = {}): Promise<PaginatedSearch> {
  return apiGet<PaginatedSearch>("/search", { q: query, page: params.page, limit: params.limit });
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
