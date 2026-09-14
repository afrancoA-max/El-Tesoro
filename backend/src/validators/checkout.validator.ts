import { z } from "zod";
import { isDepartamentoValido, isMunicipioValido, isTelefonoGtValido, normalizeTelefonoGt } from "@el-tesoro/shared";
import { isNitValido, normalizeNit } from "../utils/nit";

const telefonoGtSchema = z
  .string()
  .trim()
  .refine(isTelefonoGtValido, "Teléfono inválido. Usa 8 dígitos, ej. 5512-3456.")
  .transform(normalizeTelefonoGt);

// Mismo esquema de dirección que `address.validator.ts` (Módulo 04), sin
// `esPredeterminada` — la dirección del checkout no es necesariamente parte
// de la libreta del usuario (puede ser una dirección nueva de una sola vez).
export const checkoutAddressSchema = z
  .object({
    nombreDestinatario: z.string().trim().min(2, "El nombre del destinatario es requerido.").max(120),
    telefono: telefonoGtSchema,
    departamento: z.string().trim().refine(isDepartamentoValido, "Departamento no válido."),
    municipio: z.string().trim(),
    direccion: z.string().trim().min(5, "La dirección debe tener al menos 5 caracteres.").max(300),
    referencia: z.string().trim().max(300).optional(),
  })
  .refine((data) => isMunicipioValido(data.departamento, data.municipio), {
    message: "El municipio no pertenece al departamento seleccionado.",
    path: ["municipio"],
  });

export const checkoutContactoSchema = z.object({
  email: z.string().trim().email("Correo inválido."),
  telefono: telefonoGtSchema,
});

export const checkoutFacturacionSchema = z.object({
  nit: z.string().trim().min(2, "Indica el NIT o 'CF'.").refine(isNitValido, "NIT inválido. Usa el formato guatemalteco o 'CF'.").transform(normalizeNit),
  nombre: z.string().trim().min(2, "El nombre o razón social es requerido.").max(160),
});

export const shippingMethodCodeSchema = z.enum(["recoger_tienda", "cargo_expreso", "forza"]);

// El resto de reglas cruzadas (invitado necesita `contacto`; método
// distinto de "recoger_tienda" necesita dirección o `addressId`) dependen
// del contexto de autenticación (req.user) y se validan en
// order.service.ts, no aquí — Zod solo valida la forma de cada bloque.
export const createOrderSchema = z.object({
  addressId: z.string().uuid().optional(),
  direccion: checkoutAddressSchema.optional(),
  contacto: checkoutContactoSchema.optional(),
  facturacion: checkoutFacturacionSchema,
  metodoEnvioCodigo: shippingMethodCodeSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const shippingMethodsQuerySchema = z.object({
  departamento: z.string().trim().optional(),
  subtotal: z.string().trim().optional(),
});
