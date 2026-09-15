import { z } from "zod";

export const orderListQuerySchema = z.object({
  estado: z.enum(["pendiente_pago", "pagado", "en_preparacion", "enviado", "entregado", "cancelado"]).optional(),
  desde: z.string().trim().optional(),
  hasta: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const advanceOrderSchema = z.object({
  guiaEnvio: z.string().trim().min(1).max(80).optional(),
});

export const cancelOrderSchema = z.object({
  motivo: z.string().trim().min(3, "Indica un motivo de cancelación.").max(300),
});
