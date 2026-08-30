import { z } from "zod";

export const newsletterSubscribeSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido.").max(80),
  apellido: z.string().trim().min(1, "El apellido es requerido.").max(80),
  email: z.string().trim().toLowerCase().email("Correo inválido."),
});
