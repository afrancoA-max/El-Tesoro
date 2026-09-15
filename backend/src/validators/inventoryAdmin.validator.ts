import { z } from "zod";

export const inventoryListQuerySchema = z.object({
  q: z.string().trim().optional(),
  soloStockBajo: z.enum(["true", "false"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const adjustStockSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, "El ajuste no puede ser cero."),
  motivo: z.enum(["recepcion", "merma", "correccion"]),
  notas: z.string().trim().max(300).optional(),
});
