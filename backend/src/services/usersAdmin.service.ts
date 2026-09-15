import { ASSIGNABLE_INTERNAL_ROLES, AdminUserView } from "@el-tesoro/shared";
import type { Role } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import { hashPassword } from "../utils/password";

// "Mantenimiento de usuarios" — skill retail-backend-api-admin sección 6:
// "Gestión de usuarios administradores (crear/desactivar, asignar rol) si
// hay más de un administrador." Reemplaza el script `create-staff-user.ts`
// como vía principal (el script se deja como respaldo de arranque, ver su
// comentario actualizado) ahora que el panel puede hacerlo sin acceso a la
// base de datos.

function toAdminUserView(user: { id: string; email: string; nombre: string; role: Role; activo: boolean; createdAt: Date }): AdminUserView {
  return { id: user.id, email: user.email, nombre: user.nombre, role: user.role, activo: user.activo, createdAt: user.createdAt.toISOString() };
}

export async function listInternalUsers(): Promise<AdminUserView[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ASSIGNABLE_INTERNAL_ROLES } },
    orderBy: { createdAt: "desc" },
  });
  return users.map(toAdminUserView);
}

export interface CreateInternalUserInput {
  email: string;
  nombre: string;
  password: string;
  role: (typeof ASSIGNABLE_INTERNAL_ROLES)[number];
}

export async function createInternalUser(input: CreateInternalUserInput): Promise<AdminUserView> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict("EMAIL_ALREADY_REGISTERED", "Ya existe una cuenta con este correo.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      nombre: input.nombre,
      passwordHash,
      role: input.role,
      // El personal interno no pasa por el flujo de verificación de correo
      // del Módulo 04 (es de uso interno, dado de alta por un admin que ya
      // confirmó la identidad) — nace verificado para poder iniciar sesión
      // de inmediato.
      emailVerifiedAt: new Date(),
    },
  });
  return toAdminUserView(user);
}

export interface UpdateInternalUserInput {
  role?: (typeof ASSIGNABLE_INTERNAL_ROLES)[number];
  activo?: boolean;
  password?: string;
}

export async function updateInternalUser(id: string, input: UpdateInternalUserInput, actingAdminId: string): Promise<AdminUserView> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || !ASSIGNABLE_INTERNAL_ROLES.includes(existing.role as (typeof ASSIGNABLE_INTERNAL_ROLES)[number])) {
    throw AppError.notFound("USER_NOT_FOUND", "No existe ese usuario interno.");
  }

  // Nunca permitir que un admin se desactive o se quite el rol admin a sí
  // mismo — dejaría el panel sin nadie con acceso total hasta que otro
  // admin (que quizás no existe) lo revierta directo en la base de datos.
  if (id === actingAdminId) {
    if (input.activo === false) {
      throw AppError.badRequest("CANNOT_DEACTIVATE_SELF", "No puedes desactivar tu propia cuenta.");
    }
    if (input.role && input.role !== "admin") {
      throw AppError.badRequest("CANNOT_DEMOTE_SELF", "No puedes quitarte a ti mismo el rol de administrador.");
    }
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.activo !== undefined ? { activo: input.activo } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  // Desactivar corta el acceso YA, no en cuanto expire su access token
  // (hasta 15 min, ver JWT_ACCESS_TTL_MINUTES) — revoca todas sus sesiones
  // activas para que el próximo refresh (o la próxima vez que el
  // middleware lo verifique) lo saque.
  if (input.activo === false) {
    await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  return toAdminUserView(user);
}
