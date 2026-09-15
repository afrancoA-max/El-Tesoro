import { z } from "zod";

export const salesReportQuerySchema = z.object({
  desde: z.string().trim().refine((v) => !Number.isNaN(Date.parse(v)), "Fecha 'desde' inválida."),
  hasta: z.string().trim().refine((v) => !Number.isNaN(Date.parse(v)), "Fecha 'hasta' inválida."),
});
