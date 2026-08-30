import { Address as SharedAddress } from "@el-tesoro/shared";
import type { Address as PrismaAddress } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

const MAX_ADDRESSES_PER_USER = 10;

export interface AddressInput {
  alias?: string;
  nombreDestinatario: string;
  telefono: string;
  departamento: string;
  municipio: string;
  direccion: string;
  referencia?: string;
  esPredeterminada?: boolean;
}

function toShared(address: PrismaAddress): SharedAddress {
  return {
    id: address.id,
    alias: address.alias,
    nombreDestinatario: address.nombreDestinatario,
    telefono: address.telefono,
    departamento: address.departamento,
    municipio: address.municipio,
    direccion: address.direccion,
    referencia: address.referencia,
    esPredeterminada: address.esPredeterminada,
  };
}

export async function listAddresses(userId: string): Promise<SharedAddress[]> {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ esPredeterminada: "desc" }, { createdAt: "asc" }],
  });
  return addresses.map(toShared);
}

async function findOwned(userId: string, addressId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  // Ninguna variación de respuesta entre "no existe" y "existe pero no es
  // tuya" — ambas son 404, para no filtrar si un ID de otro usuario existe.
  if (!address || address.userId !== userId) {
    throw AppError.notFound("ADDRESS_NOT_FOUND", "No existe esa dirección.");
  }
  return address;
}

export async function createAddress(userId: string, input: AddressInput): Promise<SharedAddress> {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES_PER_USER) {
    throw AppError.badRequest("ADDRESS_LIMIT_REACHED", `Solo puedes guardar hasta ${MAX_ADDRESSES_PER_USER} direcciones.`);
  }

  // La primera dirección del usuario siempre queda predeterminada, sin
  // importar lo que envíe el cliente.
  const shouldBeDefault = count === 0 || Boolean(input.esPredeterminada);

  const address = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({ where: { userId, esPredeterminada: true }, data: { esPredeterminada: false } });
    }
    return tx.address.create({
      data: {
        userId,
        alias: input.alias || null,
        nombreDestinatario: input.nombreDestinatario,
        telefono: input.telefono,
        departamento: input.departamento,
        municipio: input.municipio,
        direccion: input.direccion,
        referencia: input.referencia || null,
        esPredeterminada: shouldBeDefault,
      },
    });
  });

  return toShared(address);
}

export async function updateAddress(userId: string, addressId: string, input: AddressInput): Promise<SharedAddress> {
  await findOwned(userId, addressId);

  const address = await prisma.$transaction(async (tx) => {
    if (input.esPredeterminada) {
      await tx.address.updateMany({
        where: { userId, esPredeterminada: true, id: { not: addressId } },
        data: { esPredeterminada: false },
      });
    }
    return tx.address.update({
      where: { id: addressId },
      data: {
        alias: input.alias || null,
        nombreDestinatario: input.nombreDestinatario,
        telefono: input.telefono,
        departamento: input.departamento,
        municipio: input.municipio,
        direccion: input.direccion,
        referencia: input.referencia || null,
        esPredeterminada: Boolean(input.esPredeterminada),
      },
    });
  });

  return toShared(address);
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<SharedAddress> {
  await findOwned(userId, addressId);

  const [, address] = await prisma.$transaction([
    prisma.address.updateMany({ where: { userId, esPredeterminada: true }, data: { esPredeterminada: false } }),
    prisma.address.update({ where: { id: addressId }, data: { esPredeterminada: true } }),
  ]);

  return toShared(address);
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const address = await findOwned(userId, addressId);

  await prisma.address.delete({ where: { id: addressId } });

  if (address.esPredeterminada) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (next) {
      await prisma.address.update({ where: { id: next.id }, data: { esPredeterminada: true } });
    }
  }
}
