import { PublicUser } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { toPublicUser } from "./auth.service";

export interface UpdateProfileInput {
  nombre?: string;
  telefono?: string;
  nit?: string;
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.telefono !== undefined ? { telefono: input.telefono || null } : {}),
      ...(input.nit !== undefined ? { nit: input.nit || null } : {}),
    },
  });
  return toPublicUser(user);
}
