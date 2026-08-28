// Módulo 01: sin endpoints de negocio todavía (eso es alcance del módulo 02).
// Este archivo solo confirma que el paquete backend compila y que el
// PrismaClient generado a partir de prisma/schema.prisma es utilizable.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
