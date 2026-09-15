-- Módulo 08 — Mantenimiento de usuarios internos.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
