import { z } from "zod";

export const categoryInputSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es requerido.").max(120),
  descripcion: z.string().trim().max(500).nullable().optional(),
  imagenUrl: z.string().trim().url("URL de imagen inválida.").nullable().optional(),
  orden: z.number().int().min(0).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const productInputSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es requerido.").max(200),
  descripcionCorta: z.string().trim().max(300).nullable().optional(),
  descripcionLarga: z.string().trim().max(5000).nullable().optional(),
  marca: z.string().trim().max(120).nullable().optional(),
  categoriaId: z.string().uuid("Selecciona una categoría."),
  especificaciones: z.record(z.unknown()).nullable().optional(),
});

export const productEstadoSchema = z.object({
  estado: z.enum(["activo", "borrador", "descontinuado"]),
});

export const productListQuerySchema = z.object({
  q: z.string().trim().optional(),
  categoriaId: z.string().uuid().optional(),
  estado: z.enum(["activo", "borrador", "descontinuado"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const variantInputSchema = z.object({
  sku: z.string().trim().min(1, "El SKU es requerido.").max(60),
  precio: z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Precio inválido, usa formato 129.99."),
  precioComparativo: z
    .string()
    .trim()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Precio comparativo inválido.")
    .nullable()
    .optional(),
  activo: z.boolean().optional(),
  cantidadDisponible: z.number().int().min(0).optional(),
  umbralStockBajo: z.number().int().min(0).optional(),
});

export const reorderImagesSchema = z.object({
  orderedImageIds: z.array(z.string().uuid()).min(1),
});

export const addImageBodySchema = z.object({
  textoAlternativo: z.string().trim().max(200).optional(),
  variantId: z.string().uuid().optional(),
});
