export type ProductStatus = "activo" | "borrador" | "descontinuado";

export type CollectionType = "manual" | "automatica";

export type ProductRelationType = "relacionado" | "complementario" | "parte_de_set";

export interface Category {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  parentId: string | null;
  orden: number;
  imagenUrl: string | null;
}

export interface AttributeType {
  id: string;
  nombre: string;
}

export interface AttributeValue {
  id: string;
  attributeTypeId: string;
  valor: string;
}

export interface Product {
  id: string;
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  descripcionLarga: string | null;
  categoriaId: string;
  marca: string | null;
  especificaciones: Record<string, unknown> | null;
  estado: ProductStatus;
  precioMayorista: string | null;
  cantidadMinimaMayorista: number | null;
  externalId: string | null;
  externalSource: string | null;
  syncedAt: string | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  precio: string;
  precioComparativo: string | null;
  pesoKg: string | null;
  dimensiones: Record<string, unknown> | null;
  activo: boolean;
  externalId: string | null;
}

export interface ProductImage {
  id: string;
  productId: string | null;
  variantId: string | null;
  url: string;
  orden: number;
  textoAlternativo: string | null;
}
