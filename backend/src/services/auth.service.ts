import { PublicUser } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";
import { hashPassword, comparePassword } from "../utils/password";
import { generateOpaqueToken, hashOpaqueToken, signAccessToken } from "../utils/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email.service";
import type { User } from "@prisma/client";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    telefono: user.telefono,
    nit: user.nit,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

async function issueTokens(user: User): Promise<Tokens> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const { raw, hash } = generateOpaqueToken();
  const refreshTokenExpiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: refreshTokenExpiresAt },
  });

  return { accessToken, refreshToken: raw, refreshTokenExpiresAt };
}

export async function register(input: { nombre: string; email: string; password: string }): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("EMAIL_ALREADY_REGISTERED", "Ya existe una cuenta con este correo.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { nombre: input.nombre, email: input.email, passwordHash },
  });

  await issueEmailVerificationToken(user);

  return toPublicUser(user);
}

async function issueEmailVerificationToken(user: User): Promise<void> {
  const { raw, hash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.emailVerificationTtlHours * 60 * 60 * 1000);
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt },
  });

  const verifyUrl = `${env.frontendUrl}/cuenta/verificar?token=${raw}`;
  await sendVerificationEmail(user.email, user.nombre, verifyUrl);
}

export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // No revelar si el correo existe o ya está verificado (evita enumeración
  // de cuentas) — siempre responde éxito al llamador.
  if (!user || user.emailVerifiedAt) return;
  await issueEmailVerificationToken(user);
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenHash = hashOpaqueToken(rawToken);
  const token = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw AppError.badRequest("INVALID_TOKEN", "El enlace de verificación es inválido o expiró.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
  ]);
}

export async function login(input: { email: string; password: string }): Promise<{ user: PublicUser; tokens: Tokens }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw AppError.unauthorized("INVALID_CREDENTIALS", "Correo o contraseña incorrectos.");
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized("INVALID_CREDENTIALS", "Correo o contraseña incorrectos.");
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

/// Rota el refresh token en cada uso (se revoca el anterior y se emite uno
/// nuevo) — limita el daño si un refresh token es robado, ya que solo sirve
/// una vez antes de invalidarse.
export async function refreshSession(rawRefreshToken: string): Promise<{ user: PublicUser; tokens: Tokens }> {
  const tokenHash = hashOpaqueToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw AppError.unauthorized("INVALID_REFRESH_TOKEN", "La sesión expiró. Inicia sesión de nuevo.");
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const tokens = await issueTokens(stored.user);
  return { user: toPublicUser(stored.user), tokens };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  const tokenHash = hashOpaqueToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Mismo criterio anti-enumeración: siempre responde éxito.
  if (!user) return;

  const { raw, hash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.passwordResetTtlHours * 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash, expiresAt } });

  const resetUrl = `${env.frontendUrl}/cuenta/restablecer-password?token=${raw}`;
  await sendPasswordResetEmail(user.email, user.nombre, resetUrl).catch((error) => {
    logger.error({ err: error, userId: user.id }, "No se pudo enviar el correo de recuperación.");
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashOpaqueToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw AppError.badRequest("INVALID_TOKEN", "El enlace es inválido o expiró.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    // Cambiar la contraseña cierra todas las sesiones activas — evita que
    // una sesión robada sobreviva a la recuperación.
    prisma.refreshToken.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getPublicUserById(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw AppError.unauthorized("USER_NOT_FOUND", "No autenticado.");
  }
  return toPublicUser(user);
}

export { toPublicUser };
