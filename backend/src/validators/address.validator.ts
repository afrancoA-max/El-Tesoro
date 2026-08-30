import { z } from "zod";
import { isDepartamentoValido, isMunicipioValido } from "@el-tesoro/shared";

export const addressSchema = z
  .object({
    alias: z.string().trim().max(60).optional(),
    nombreDestinatario: z.string().trim().min(2, "El nombre del destinatario es requerido.").max(120),
    telefono: z
      .string()
      .trim()
      .regex(/^(\+502)?\d{8}$/, "Teléfono inválido. Usa 8 dígitos, ej. 5512-3456."),
    departamento: z.string().trim().refine(isDepartamentoValido, "Departamento no válido."),
    municipio: z.string().trim(),
    direccion: z.string().trim().min(5, "La dirección debe tener al menos 5 caracteres.").max(300),
    referencia: z.string().trim().max(300).optional(),
    esPredeterminada: z.boolean().optional(),
  })
  .refine((data) => isMunicipioValido(data.departamento, data.municipio), {
    message: "El municipio no pertenece al departamento seleccionado.",
    path: ["municipio"],
  });

export const updateAddressSchema = addressSchema;
