// CAT-06: los banners del home se administran con este script en vez de un
// panel admin (no existe ninguno todavía en el proyecto, ver Módulo 08) —
// corre contra la base de datos real (misma DATABASE_URL que el backend) y
// no requiere redeploy para que un cambio se vea en el sitio.
//
// Si no hay ningún banner activo, el home sigue con el comportamiento
// automático que ya tenía (bloques armados con fotos de producto).
//
// Uso:
//   npm run manage-banners -- --action=list
//   npm run manage-banners -- --action=create --titulo="Todo en Ollas" \
//     --imagenUrl="https://storage.googleapis.com/.../banner.jpg" \
//     --enlace="/categoria/ollas" [--subtitulo="..."] [--orden=1] \
//     [--fechaInicio=2026-01-01] [--fechaFin=2026-01-31] [--inactivo]
//   npm run manage-banners -- --action=update --id=<id> [--titulo=...] [--subtitulo=...] \
//     [--imagenUrl=...] [--enlace=...] [--orden=...] [--fechaInicio=...] [--fechaFin=...]
//   npm run manage-banners -- --action=activar --id=<id>
//   npm run manage-banners -- --action=desactivar --id=<id>
//   npm run manage-banners -- --action=eliminar --id=<id>

import { z } from "zod";
import { prisma } from "../src/config/prisma";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const dateArg = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida, usa AAAA-MM-DD")
  .transform((v) => new Date(v));

const createSchema = z.object({
  titulo: z.string().min(1, "--titulo es obligatorio"),
  subtitulo: z.string().optional(),
  imagenUrl: z.string().url("--imagenUrl debe ser una URL válida"),
  enlace: z.string().min(1, "--enlace es obligatorio (ej. /categoria/ollas)"),
  orden: z.coerce.number().int().optional().default(0),
  fechaInicio: dateArg.optional(),
  fechaFin: dateArg.optional(),
});

const updateSchema = z.object({
  id: z.string().uuid("--id debe ser un uuid válido"),
  titulo: z.string().min(1).optional(),
  subtitulo: z.string().optional(),
  imagenUrl: z.string().url().optional(),
  enlace: z.string().min(1).optional(),
  orden: z.coerce.number().int().optional(),
  fechaInicio: dateArg.optional(),
  fechaFin: dateArg.optional(),
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function listBanners() {
  const banners = await prisma.banner.findMany({ orderBy: [{ activo: "desc" }, { orden: "asc" }] });
  if (banners.length === 0) {
    console.log("No hay banners todavía. El home usa su selección automática por categoría.");
    return;
  }
  console.log(`\n${banners.length} banner(es):\n`);
  for (const b of banners) {
    const vigencia =
      b.fechaInicio || b.fechaFin
        ? ` | vigente ${b.fechaInicio?.toISOString().slice(0, 10) ?? "…"} → ${b.fechaFin?.toISOString().slice(0, 10) ?? "…"}`
        : "";
    console.log(
      `${b.activo ? "🟢" : "⚪"} [${b.id}] (orden ${b.orden}) "${b.titulo}"${b.subtitulo ? ` — ${b.subtitulo}` : ""} → ${b.enlace}${vigencia}`,
    );
  }
}

async function createBanner() {
  const parsed = createSchema.safeParse({
    titulo: readArg("titulo"),
    subtitulo: readArg("subtitulo"),
    imagenUrl: readArg("imagenUrl"),
    enlace: readArg("enlace"),
    orden: readArg("orden"),
    fechaInicio: readArg("fechaInicio"),
    fechaFin: readArg("fechaFin"),
  });
  if (!parsed.success) fail(parsed.error.issues.map((i) => i.message).join("\n"));

  const banner = await prisma.banner.create({
    data: { ...parsed.data, activo: !hasFlag("inactivo") },
  });
  console.log(`Creado: [${banner.id}] "${banner.titulo}"`);
}

async function updateBanner() {
  const parsed = updateSchema.safeParse({
    id: readArg("id"),
    titulo: readArg("titulo"),
    subtitulo: readArg("subtitulo"),
    imagenUrl: readArg("imagenUrl"),
    enlace: readArg("enlace"),
    orden: readArg("orden"),
    fechaInicio: readArg("fechaInicio"),
    fechaFin: readArg("fechaFin"),
  });
  if (!parsed.success) fail(parsed.error.issues.map((i) => i.message).join("\n"));

  const { id, ...data } = parsed.data;
  const banner = await prisma.banner.update({ where: { id }, data });
  console.log(`Actualizado: [${banner.id}] "${banner.titulo}"`);
}

async function setActivo(activo: boolean) {
  const id = readArg("id");
  if (!id) fail("--id es obligatorio");
  const banner = await prisma.banner.update({ where: { id: id! }, data: { activo } });
  console.log(`${activo ? "Activado" : "Desactivado"}: [${banner.id}] "${banner.titulo}"`);
}

async function deleteBanner() {
  const id = readArg("id");
  if (!id) fail("--id es obligatorio");
  const banner = await prisma.banner.delete({ where: { id: id! } });
  console.log(`Eliminado: [${banner.id}] "${banner.titulo}"`);
}

async function main() {
  const action = readArg("action");
  switch (action) {
    case "list":
      return listBanners();
    case "create":
      return createBanner();
    case "update":
      return updateBanner();
    case "activar":
      return setActivo(true);
    case "desactivar":
      return setActivo(false);
    case "eliminar":
      return deleteBanner();
    default:
      fail(
        "Uso: --action=list | create | update | activar | desactivar | eliminar (ver comentario al inicio del archivo para los parámetros de cada uno)",
      );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
