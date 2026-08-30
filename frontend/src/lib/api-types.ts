// Formas de respuesta de la API de catálogo (Módulo 02).
// Reflejan la respuesta real observada en staging — ver backend/src/routes/public/*.ts.

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface CategoryNode {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  orden: number;
  children: CategoryNode[];
}

export interface VarianteUnica {
  id: string;
  disponible: boolean;
}

export interface ProductListItem {
  id: string;
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  marca: string | null;
  categoria: { slug: string; nombre: string };
  precioDesde: number;
  disponible: boolean;
  // Vacío en casi todo el catálogo actual: depende de que el Excel de
  // origen tenga la columna "Material" (ver backend/scripts/import-catalog.ts).
  materiales: string[];
  imagenPrincipal: string | null;
  // Solo presente si el producto tiene exactamente una variante — permite
  // agregar al carrito directo desde la tarjeta (Módulo 05) sin pasar por
  // la ficha, donde sí hay que elegir Talla/Color/etc.
  varianteUnica: VarianteUnica | null;
  createdAt: string;
}

export interface PaginatedProducts {
  items: ProductListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VariantAttribute {
  tipo: string;
  valor: string;
}

export interface ProductImage {
  url: string;
  textoAlternativo: string | null;
  orden: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  precio: string;
  precioComparativo: string | null;
  activo: boolean;
  disponible: boolean;
  atributos: VariantAttribute[];
  imagenes: ProductImage[];
}

export interface ProductDetail {
  id: string;
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  descripcionLarga: string | null;
  marca: string | null;
  especificaciones: Record<string, string> | null;
  estado: string;
  categoria: { slug: string; nombre: string };
  imagenes: ProductImage[];
  variantes: ProductVariant[];
  relacionados: ProductListItem[];
}

export interface SearchResultItem {
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  precioDesde: number;
  imagenPrincipal: string | null;
  varianteUnica: VarianteUnica | null;
}

export interface PaginatedSearch {
  items: SearchResultItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  precioMin?: number;
  precioMax?: number;
  marca?: string;
  material?: string;
  disponible?: boolean;
  sort?: "precio_asc" | "precio_desc" | "novedad";
}
