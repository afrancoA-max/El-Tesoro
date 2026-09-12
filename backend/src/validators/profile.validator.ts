import { z } from "zod";
import { isTelefonoGtValido, normalizeTelefonoGt } from "@el-tesoro/shared";
import { isNitValido, normalizeNit } from "../utils/nit";

const telefonoGtSchema = z
  .string()
  .trim()
  .refine(isTelefonoGtValido, "Teléfono inválido. Usa 8 dígitos, ej. 5512-3456.")
  .transform(normalizeTelefonoGt);

export const updateProfileSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(120).optional(),
  telefono: z.union([telefonoGtSchema, z.literal("")]).optional(),
  nit: z
    .union([
      z.string().trim().min(2).refine(isNitValido, "NIT inválido. Usa el formato guatemalteco o 'CF'.").transform(normalizeNit),
      z.literal(""),
    ])
    .optional(),
});
