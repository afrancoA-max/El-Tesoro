import { z } from "zod";

// Debe coincidir con `ASSIGNABLE_INTERNAL_ROLES` (shared/src/admin.ts) — no
// se reusa directamente porque z.enum necesita una tupla de literales para
// que el tipo inferido sea el union literal, no `string[]`.
const internalRoleSchema = z.enum(["admin", "staff", "operador", "servicio_cliente"]);

export const createInternalUserSchema = z.object({
  email: z.string().trim().email("Correo inválido."),
  nombre: z.string().trim().min(2, "El nombre es requerido.").max(120),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  role: internalRoleSchema,
});

export const updateInternalUserSchema = z.object({
  role: internalRoleSchema.optional(),
  activo: z.boolean().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional(),
});
