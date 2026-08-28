// Importador de catálogo — Módulo 02.
//
// Vía oficial de carga de catálogo hasta que exista el panel admin (módulo
// 08) o el API real de productos del negocio (aún no existe, ver
// docs/plan/02-api-catalogo.md). Lee el Excel real del almacén, filtra a las
// filas que ya tienen un precio numérico real (decisión tomada con el dueño:
// el 94% del archivo dice "Consultar precio" y no se importa hasta tener el
// dato real), sube las fotos a Cloud Storage, y crea/actualiza productos de
// forma re-ejecutable (upsert por externalSource+externalId, nunca duplica).
//
// Uso:
//   npm run import:catalogo -- --file="../productos_almacen_el_tesoro_completo.xlsx"
//   npm run import:catalogo -- --file=/ruta/al/excel.xlsx --bucket=mi-bucket --skip-images

import path from "node:path";
import * as XLSX from "xlsx";
import { Storage } from "@google-cloud/storage";
import { prisma } from "../src/config/prisma";
import { normalizeText } from "../src/utils/normalizeText";
import { resolveCategorySlug } from "./categoryMapping";

const EXTERNAL_SOURCE = "excel_almacen_2026";
const DEFAULT_FILE = path.resolve(__dirname, "../../productos_almacen_el_tesoro_completo.xlsx");
const DEFAULT_BUCKET = "eltesoro-product-images-staging";

interface RawRow {
  Código: unknown;
  Descripción: unknown;
  "Precio (Q)": unknown;
  Existencia: unknown;
  Categoría: unknown;
  Marca: unknown;
  "Fotografía (URL)": unknown;
}

interface RejectedRow {
  fila: number;
  codigo: string;
  descripcion: string;
  motivo: string;
}

interface Warning {
  fila: number;
  codigo: string;
  mensaje: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string, fallback: string) => {
    const prefix = `--${name}=`;
    const found = args.find((a) => a.startsWith(prefix));
    return found ? found.slice(prefix.length) : fallback;
  };
  return {
    file: get("file", DEFAULT_FILE),
    bucket: get("bucket", DEFAULT_BUCKET),
    skipImages: args.includes("--skip-images"),
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(base: string, externalId: string): Promise<string> {
  const existingWithSameExternalId = await prisma.product.findUnique({
    where: { externalSource_externalId: { externalSource: EXTERNAL_SOURCE, externalId } },
    select: { slug: true },
  });
  if (existingWithSameExternalId) return existingWithSameExternalId.slug;

  let candidate = base;
  let suffix = 2;
  // Colisión de slug entre productos DISTINTOS del archivo (descripciones
  // parecidas) — se resuelve agregando un sufijo numérico estable.
  while (await prisma.product.findFirst({ where: { slug: candidate, NOT: { externalId } } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function guessExtension(url: string): string {
  const match = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.exec(url);
  return match ? match[1].toLowerCase() : "jpg";
}

async function uploadImageIfNeeded(
  storage: Storage,
  bucketName: string,
  sourceUrl: string,
  destPath: string,
): Promise<string | null> {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destPath);

  const [exists] = await file.exists();
  if (!exists) {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al descargar la imagen`);
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    await file.save(buffer, { contentType, resumable: false });
  }

  return `https://storage.googleapis.com/${bucketName}/${destPath}`;
}

async function main() {
  const { file, bucket, skipImages } = parseArgs();
  console.log(`Leyendo catálogo desde: ${file}`);

  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });

  const storage = new Storage();

  let importados = 0;
  let actualizados = 0;
  const rechazadas: RejectedRow[] = [];
  const advertencias: Warning[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const fila = i + 2; // +1 por índice base 0, +1 por la fila de encabezado
    const row = rows[i];
    const codigo = String(row["Código"] ?? "").trim();
    const descripcion = String(row["Descripción"] ?? "").trim();
    const precioRaw = row["Precio (Q)"];
    const categoriaRaw = String(row["Categoría"] ?? "").trim();
    const marca = row["Marca"] ? String(row["Marca"]).trim() : null;
    const fotoUrl = row["Fotografía (URL)"] ? String(row["Fotografía (URL)"]).trim() : null;

    if (!descripcion) {
      rechazadas.push({ fila, codigo, descripcion, motivo: "Descripción vacía" });
      continue;
    }

    if (typeof precioRaw !== "number") {
      rechazadas.push({
        fila,
        codigo,
        descripcion,
        motivo: `Sin precio numérico real (valor: '${String(precioRaw)}') — pendiente hasta tener el dato real del negocio`,
      });
      continue;
    }

    const externalId = String(fila);
    const { slug: categoriaSlug, fuente } = resolveCategorySlug(categoriaRaw, descripcion);

    const categoria = await prisma.category.findUnique({ where: { slug: categoriaSlug } });
    if (!categoria) {
      rechazadas.push({
        fila,
        codigo,
        descripcion,
        motivo: `Categoría mapeada '${categoriaSlug}' (desde '${categoriaRaw}') no existe en la base de datos`,
      });
      continue;
    }
    if (fuente === "categoria_desconocida") {
      advertencias.push({
        fila,
        codigo,
        mensaje: `Categoría real '${categoriaRaw}' sin mapeo conocido — asignada a '${categoriaSlug}' por defecto`,
      });
    }

    const baseSlug = slugify(`${descripcion}-${codigo}`);
    const slug = await ensureUniqueSlug(baseSlug, externalId);
    const sku = `IMP-${codigo || "SC"}-${externalId}`.toUpperCase();
    const busqueda = normalizeText(`${descripcion} ${marca ?? ""} ${categoria.nombre}`);

    const existing = await prisma.product.findUnique({
      where: { externalSource_externalId: { externalSource: EXTERNAL_SOURCE, externalId } },
    });

    const product = await prisma.product.upsert({
      where: { externalSource_externalId: { externalSource: EXTERNAL_SOURCE, externalId } },
      update: {
        nombre: descripcion,
        descripcionCorta: descripcion.slice(0, 160),
        marca,
        categoriaId: categoria.id,
        estado: "activo",
        busqueda,
        rawPayload: row as unknown as object,
        syncedAt: new Date(),
      },
      create: {
        slug,
        nombre: descripcion,
        descripcionCorta: descripcion.slice(0, 160),
        marca,
        categoriaId: categoria.id,
        estado: "activo",
        busqueda,
        externalSource: EXTERNAL_SOURCE,
        externalId,
        rawPayload: row as unknown as object,
        syncedAt: new Date(),
      },
    });

    const variant = await prisma.productVariant.upsert({
      where: { sku },
      update: { precio: precioRaw, externalId },
      create: { sku, productId: product.id, precio: precioRaw, externalId, activo: true },
    });

    await prisma.inventory.upsert({
      where: { variantId: variant.id },
      update: {},
      create: { variantId: variant.id, cantidadDisponible: 0, umbralStockBajo: 5 },
    });

    if (fotoUrl && !skipImages) {
      try {
        const destPath = `productos/${externalId}.${guessExtension(fotoUrl)}`;
        const publicUrl = await uploadImageIfNeeded(storage, bucket, fotoUrl, destPath);
        if (publicUrl) {
          const existingImage = await prisma.productImage.findFirst({ where: { productId: product.id } });
          if (existingImage) {
            await prisma.productImage.update({ where: { id: existingImage.id }, data: { url: publicUrl } });
          } else {
            await prisma.productImage.create({
              data: { productId: product.id, url: publicUrl, orden: 0, textoAlternativo: descripcion },
            });
          }
        }
      } catch (error) {
        advertencias.push({
          fila,
          codigo,
          mensaje: `No se pudo descargar/subir la imagen (${(error as Error).message}) — producto importado sin imagen`,
        });
      }
    }

    if (existing) {
      actualizados += 1;
    } else {
      importados += 1;
    }
  }

  console.log("\n=== Resumen de importación ===");
  console.log(`Filas en el archivo: ${rows.length}`);
  console.log(`Productos nuevos:     ${importados}`);
  console.log(`Productos actualizados: ${actualizados}`);
  console.log(`Filas rechazadas:     ${rechazadas.length}`);
  console.log(`Advertencias:         ${advertencias.length}`);

  if (rechazadas.length > 0) {
    console.log("\n--- Filas rechazadas (motivo) ---");
    for (const r of rechazadas.slice(0, 20)) {
      console.log(`Fila ${r.fila} [${r.codigo}] ${r.descripcion.slice(0, 50)} → ${r.motivo}`);
    }
    if (rechazadas.length > 20) {
      console.log(`... y ${rechazadas.length - 20} más (ver import-rechazadas.json)`);
    }
    const fs = await import("node:fs");
    fs.writeFileSync(
      path.resolve(__dirname, "import-rechazadas.json"),
      JSON.stringify(rechazadas, null, 2),
      "utf-8",
    );
  }

  if (advertencias.length > 0) {
    const fs = await import("node:fs");
    fs.writeFileSync(
      path.resolve(__dirname, "import-advertencias.json"),
      JSON.stringify(advertencias, null, 2),
      "utf-8",
    );
    console.log(`\nAdvertencias guardadas en scripts/import-advertencias.json`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
