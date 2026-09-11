import { z } from "zod";

export const staffInventoryQuerySchema = z.object({
  q: z.string().min(2, "El parámetro 'q' debe tener al menos 2 caracteres."),
  page: z.string().optional(),
  limit: z.string().optional(),
});
