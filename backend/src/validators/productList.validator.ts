import { z } from "zod";

export const productListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  precioMin: z.coerce.number().nonnegative().optional(),
  precioMax: z.coerce.number().nonnegative().optional(),
  marca: z.string().min(1).optional(),
  disponible: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z.enum(["precio_asc", "precio_desc", "novedad"]).optional().default("novedad"),
});

export const searchQuerySchema = z.object({
  q: z.string().min(2, "El parámetro 'q' debe tener al menos 2 caracteres."),
  page: z.string().optional(),
  limit: z.string().optional(),
});
