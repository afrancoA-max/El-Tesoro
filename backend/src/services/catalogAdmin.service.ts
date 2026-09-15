import { Prisma, ProductStatus } from "@prisma/client";
import type { AdminCategoryView, AdminProductSummaryView, AdminProductView } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { normalizeText } from "../utils/normalizeText";
import { ensureUniqueCategorySlug, ensureUniqueProductSlug, slugify } from "../utils/slug";
import { uploadProductImage } from "../utils/gcs";
import { buildPaginatedResult, PaginatedResult, PaginationParams } from "../utils/pagination";

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export async function listCategoriesAdmin(): Promise<AdminCategoryView[]> {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: { orden: "asc" } }),
    prisma.product.groupBy({ by: ["categoriaId"], _count: true }),
  ]);
  const countByCategory = new Map<string, number>(counts.map((c) => [c.categoriaId, c._count]));

  return categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    nombre: c.nombre,
    descripcion: c.descripcion,
    imagenUrl: c.imagenUrl,
    orden: c.orden,
    parentId: c.parentId,
    productCount: countByCategory.get(c.id) ?? 0,
  }));
}

export interface CategoryInput {
  nombre: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  orden?: number;
  parentId?: string | null;
}

export async function createCategory(input: CategoryInput): Promise<AdminCategoryView> {
  const slug = await ensureUniqueCategorySlug(slugify(input.nombre));
  const category = await prisma.category.create({
    data: {
      slug,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      imagenUrl: input.imagenUrl ?? null,
      orden: input.orden ?? 0,
      parentId: input.parentId ?? null,
    },
  });
  return { ...category, productCount: 0 };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<AdminCategoryView> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("CATEGORY_NOT_FOUND", "No existe esa categoría.");

  if (input.parentId === id) {
    throw AppError.badRequest("INVALID_PARENT", "Una categoría no puede ser su propio padre.");
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      imagenUrl: input.imagenUrl ?? null,
      orden: input.orden ?? existing.orden,
      parentId: input.parentId ?? null,
    },
  });
  const productCount = await prisma.product.count({ where: { categoriaId: id } });
  return { ...category, productCount };
}

export async function deleteCategory(id: string): Promise<void> {
  const [childCount, productCount] = await Promise.all([
    prisma.category.count({ where: { parentId: id } }),
    prisma.product.count({ where: { categoriaId: id } }),
  ]);
  if (childCount > 0) {
    throw AppError.conflict("CATEGORY_HAS_CHILDREN", "No se puede eliminar: tiene subcategorías. Muévelas o elimínalas primero.");
  }
  if (productCount > 0) {
    throw AppError.conflict("CATEGORY_HAS_PRODUCTS", "No se puede eliminar: tiene productos asignados. Muévelos a otra categoría primero.");
  }
  await prisma.category.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

const adminProductInclude = {
  categoria: true,
  images: { orderBy: { orden: "asc" as const } },
  variants: { include: { inventory: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.ProductInclude;

type AdminProductRow = Prisma.ProductGetPayload<{ include: typeof adminProductInclude }>;

function toAdminProductView(product: AdminProductRow): AdminProductView {
  return {
    id: product.id,
    slug: product.slug,
    nombre: product.nombre,
    descripcionCorta: product.descripcionCorta,
    descripcionLarga: product.descripcionLarga,
    marca: product.marca,
    estado: product.estado,
    categoriaId: product.categoriaId,
    categoriaNombre: product.categoria.nombre,
    externalSource: product.externalSource,
    syncedAt: product.syncedAt ? product.syncedAt.toISOString() : null,
    images: product.images.map((img) => ({ id: img.id, url: img.url, orden: img.orden, textoAlternativo: img.textoAlternativo, variantId: img.variantId })),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      activo: v.activo,
      precio: v.precio.toFixed(2),
      precioComparativo: v.precioComparativo?.toFixed(2) ?? null,
      cantidadDisponible: v.inventory?.cantidadDisponible ?? 0,
      cantidadReservada: v.inventory?.cantidadReservada ?? 0,
      umbralStockBajo: v.inventory?.umbralStockBajo ?? 0,
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export interface AdminProductListFilters {
  q?: string;
  categoriaId?: string;
  estado?: ProductStatus;
}

export async function listAdminProducts(
  filters: AdminProductListFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<AdminProductSummaryView>> {
  const where: Prisma.ProductWhereInput = {
    ...(filters.categoriaId ? { categoriaId: filters.categoriaId } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.q ? { busqueda: { contains: normalizeText(filters.q) } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        categoria: true,
        images: { orderBy: { orden: "asc" }, take: 1 },
        variants: { select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.product.count({ where }),
  ]);

  const items: AdminProductSummaryView[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    marca: p.marca,
    estado: p.estado,
    categoriaNombre: p.categoria.nombre,
    imagenPrincipal: p.images[0]?.url ?? null,
    variantCount: p.variants.length,
    externalSource: p.externalSource,
  }));

  return buildPaginatedResult(items, total, pagination);
}

export async function getAdminProductDetail(id: string): Promise<AdminProductView> {
  const product = await prisma.product.findUnique({ where: { id }, include: adminProductInclude });
  if (!product) throw AppError.notFound("PRODUCT_NOT_FOUND", "No existe ese producto.");
  return toAdminProductView(product);
}

export interface ProductInput {
  nombre: string;
  descripcionCorta?: string | null;
  descripcionLarga?: string | null;
  marca?: string | null;
  categoriaId: string;
  especificaciones?: Record<string, unknown> | null;
}

async function assertCategoryExists(categoriaId: string): Promise<void> {
  const exists = await prisma.category.findUnique({ where: { id: categoriaId }, select: { id: true } });
  if (!exists) throw AppError.badRequest("CATEGORY_NOT_FOUND", "La categoría indicada no existe.");
}

// Módulo 08: los productos "de verdad" del negocio llegarán por el futuro
// sync con el API del cliente (externalSource distinto de éste) — esta
// creación manual es la herramienta de mantenimiento mientras ese sync no
// existe, y después seguirá sirviendo para altas puntuales que el sync no
// cubra. Nace en "borrador" (default de schema.prisma) hasta que se publique
// explícitamente con `setProductEstado`.
export async function createProduct(input: ProductInput): Promise<AdminProductView> {
  await assertCategoryExists(input.categoriaId);
  const categoria = await prisma.category.findUniqueOrThrow({ where: { id: input.categoriaId } });
  const slug = await ensureUniqueProductSlug(slugify(input.nombre));
  const busqueda = normalizeText(`${input.nombre} ${input.marca ?? ""} ${categoria.nombre}`);

  const product = await prisma.product.create({
    data: {
      slug,
      nombre: input.nombre,
      descripcionCorta: input.descripcionCorta ?? null,
      descripcionLarga: input.descripcionLarga ?? null,
      marca: input.marca ?? null,
      categoriaId: input.categoriaId,
      especificaciones: (input.especificaciones as Prisma.InputJsonValue) ?? undefined,
      busqueda,
    },
    include: adminProductInclude,
  });
  return toAdminProductView(product);
}

export async function updateProduct(id: string, input: ProductInput): Promise<AdminProductView> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("PRODUCT_NOT_FOUND", "No existe ese producto.");
  await assertCategoryExists(input.categoriaId);
  const categoria = await prisma.category.findUniqueOrThrow({ where: { id: input.categoriaId } });

  // El slug no cambia al editar (evita romper enlaces/SEO ya indexados por
  // Google — ver skill retail-seo-performance): solo se fija al crear.
  const busqueda = normalizeText(`${input.nombre} ${input.marca ?? ""} ${categoria.nombre}`);

  const product = await prisma.product.update({
    where: { id },
    data: {
      nombre: input.nombre,
      descripcionCorta: input.descripcionCorta ?? null,
      descripcionLarga: input.descripcionLarga ?? null,
      marca: input.marca ?? null,
      categoriaId: input.categoriaId,
      especificaciones: (input.especificaciones as Prisma.InputJsonValue) ?? undefined,
      busqueda,
    },
    include: adminProductInclude,
  });
  return toAdminProductView(product);
}

export async function setProductEstado(id: string, estado: ProductStatus): Promise<AdminProductView> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("PRODUCT_NOT_FOUND", "No existe ese producto.");
  const product = await prisma.product.update({ where: { id }, data: { estado }, include: adminProductInclude });
  return toAdminProductView(product);
}

export async function deleteProduct(id: string): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("PRODUCT_NOT_FOUND", "No existe ese producto.");
  // Cascada de schema.prisma: borra variantes/imágenes/inventario; los
  // OrderItem de pedidos históricos solo pierden el vínculo (variantId ->
  // null, onDelete: SetNull) pero conservan su propio snapshot de
  // nombre/sku/precio — no se rompe el historial de pedidos (Listo cuando,
  // punto 6). Preferir `setProductEstado` (desactivar) para no perder el
  // registro del producto; esto es para altas erróneas.
  await prisma.product.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Variantes
// ---------------------------------------------------------------------------

export interface VariantInput {
  sku: string;
  precio: string;
  precioComparativo?: string | null;
  activo?: boolean;
  cantidadDisponible?: number;
  umbralStockBajo?: number;
}

export async function createVariant(productId: string, input: VariantInput) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw AppError.notFound("PRODUCT_NOT_FOUND", "No existe ese producto.");

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku: input.sku,
      precio: input.precio,
      precioComparativo: input.precioComparativo ?? null,
      activo: input.activo ?? true,
      inventory: {
        create: {
          cantidadDisponible: input.cantidadDisponible ?? 0,
          umbralStockBajo: input.umbralStockBajo ?? 5,
        },
      },
    },
    include: { inventory: true },
  });
  return variant;
}

export async function updateVariant(variantId: string, input: Omit<VariantInput, "cantidadDisponible">) {
  const existing = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!existing) throw AppError.notFound("VARIANT_NOT_FOUND", "No existe esa variante.");

  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      sku: input.sku,
      precio: input.precio,
      precioComparativo: input.precioComparativo ?? null,
      activo: input.activo ?? existing.activo,
      ...(input.umbralStockBajo !== undefined ? { inventory: { update: { umbralStockBajo: input.umbralStockBajo } } } : {}),
    },
    include: { inventory: true },
  });
  return variant;
}

export async function deleteVariant(variantId: string): Promise<void> {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { _count: { select: { orderItems: true } } } });
  if (!variant) throw AppError.notFound("VARIANT_NOT_FOUND", "No existe esa variante.");
  if (variant._count.orderItems > 0) {
    throw AppError.conflict(
      "VARIANT_HAS_ORDERS",
      "Esta variante aparece en pedidos existentes; desactívala en vez de eliminarla para no perder el historial.",
    );
  }
  await prisma.productVariant.delete({ where: { id: variantId } });
}

// ---------------------------------------------------------------------------
// Imágenes
// ---------------------------------------------------------------------------

function guessImageExtension(mimeType: string): string {
  const match = /^image\/(jpeg|jpg|png|webp|gif)$/i.exec(mimeType);
  return match ? (match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase()) : "jpg";
}

export async function addProductImage(
  productId: string,
  file: { buffer: Buffer; mimetype: string },
  opts: { textoAlternativo?: string | null; variantId?: string | null },
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw AppError.notFound("PRODUCT_NOT_FOUND", "No existe ese producto.");

  const maxOrden = await prisma.productImage.aggregate({ where: { productId }, _max: { orden: true } });
  const destPath = `productos/${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${guessImageExtension(file.mimetype)}`;
  const url = await uploadProductImage(destPath, file.buffer, file.mimetype);

  return prisma.productImage.create({
    data: {
      productId,
      variantId: opts.variantId ?? null,
      url,
      orden: (maxOrden._max.orden ?? -1) + 1,
      textoAlternativo: opts.textoAlternativo ?? null,
    },
  });
}

export async function reorderProductImages(productId: string, orderedImageIds: string[]): Promise<void> {
  const images = await prisma.productImage.findMany({ where: { productId } });
  const validIds = new Set(images.map((img) => img.id));
  if (orderedImageIds.length !== images.length || !orderedImageIds.every((id) => validIds.has(id))) {
    throw AppError.badRequest("INVALID_IMAGE_ORDER", "La lista de imágenes no coincide con las imágenes del producto.");
  }

  await prisma.$transaction(orderedImageIds.map((id, orden) => prisma.productImage.update({ where: { id }, data: { orden } })));
}

export async function deleteProductImage(imageId: string): Promise<void> {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) throw AppError.notFound("IMAGE_NOT_FOUND", "No existe esa imagen.");
  // No se borra el archivo del bucket (mismo criterio que el importador: no
  // hay una rutina de limpieza de GCS todavía) — solo se desvincula de la
  // base de datos, que es lo que decide qué se muestra en el sitio.
  await prisma.productImage.delete({ where: { id: imageId } });
}
