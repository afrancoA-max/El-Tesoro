import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("Correo inválido.");
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número.");

export const registerSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es requerida."),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, "Token inválido."),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Token inválido."),
  password: passwordSchema,
});
