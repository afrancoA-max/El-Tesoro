import { z } from "zod";
import { isNitValido, normalizeNit } from "../utils/nit";

const telefonoGtSchema = z
  .string()
  .trim()
  .regex(/^(\+502)?\d{8}$/, "Teléfono inválido. Usa 8 dígitos, ej. 5512-3456.");

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
