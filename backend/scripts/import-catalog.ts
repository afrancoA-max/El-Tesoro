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
// Varias fotos por producto: agregar columnas "Fotografía 2 (URL)",
// "Fotografía 3 (URL)", etc. junto a la columna original "Fotografía (URL)"
// — no todas las filas necesitan la misma cantidad, las columnas vacías se
// ignoran. El orden de las columnas define el orden en la galería.
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
  // Fotos adicionales: "Fotografía 2 (URL)", "Fotografía 3 (URL)", etc. — ver
  // collectPhotoUrls. No están tipadas aquí porque la cantidad de columnas es
  // variable (el Excel puede traer 1 o varias, no hay un máximo fijo).
  // Opcional: el archivo real hoy no trae esta columna (ver docs/plan/03,
  // riesgo "filtro de material"). Si el negocio la agrega más adelante, se
  // recoge automáticamente sin más cambios de código — ver
  // ensureMaterialAttribute más abajo.
  Material?: unknown;
}

// Junta "Fotografía (URL)", "Fotografía 2 (URL)", "Fotografía 3 (URL)"... en
// una lista ordenada — el negocio puede agregar tantas columnas como
// necesite (no todas las filas necesitan la misma cantidad de fotos), sin
// tocar este código. El orden de las columnas define el orden de la
// galería; la primera sigue siendo la foto de portada.
function collectPhotoUrls(row: Record<string, unknown>): string[] {
  const entries: Array<[number, string]> = [];
  for (const [key, value] of Object.entries(row)) {
    const match = /^Fotograf[ií]a\s*(\d*)\s*\(URL\)$/i.exec(key.trim());
    if (!match) continue;
    const url = value ? String(value).trim() : "";
    if (!url) continue;
    const index = match[1] ? Number(match[1]) : 1;
    entries.push([index, url]);
  }
  return entries.sort((a, b) => a[0] - b[0]).map(([, url]) => url);
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

// Idempotente: si el material cambia en una re-importación, reemplaza el
// vínculo anterior en vez de acumular valores viejos sobre la misma variante.
async function ensureMaterialAttribute(variantId: string, materialRaw: string): Promise<void> {
  const attributeType = await prisma.attributeType.upsert({
    where: { nombre: "Material" },
    update: {},
    create: { nombre: "Material" },
  });

  const attributeValue = await prisma.attributeValue.upsert({
    where: { attributeTypeId_valor: { attributeTypeId: attributeType.id, valor: materialRaw } },
    update: {},
    create: { attributeTypeId: attributeType.id, valor: materialRaw },
  });

  await prisma.variantAttributeValue.deleteMany({
    where: { variantId, attributeValue: { attributeTypeId: attributeType.id } },
  });
  await prisma.variantAttributeValue.create({
    data: { variantId, attributeValueId: attributeValue.id },
  });
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
    const fotoUrls = collectPhotoUrls(row as unknown as Record<string, unknown>);
    const material = row["Material"] ? String(row["Material"]).trim() : null;
    // Antes se ignoraba por completo: todo producto quedaba con stock 0 y
    // por lo tanto "Agotado" sin importar la existencia real. Un valor no
    // numérico (celda vacía, texto) se trata como 0, no como rechazo — el
    // producto igual se importa, solo sin stock hasta tener el dato real.
    const existenciaRaw = row["Existencia"];
    const existencia = typeof existenciaRaw === "number" && existenciaRaw >= 0 ? Math.floor(existenciaRaw) : 0;

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

    if (material) {
      await ensureMaterialAttribute(variant.id, material);
    }

    await prisma.inventory.upsert({
      where: { variantId: variant.id },
      update: { cantidadDisponible: existencia },
      create: { variantId: variant.id, cantidadDisponible: existencia, umbralStockBajo: 5 },
    });

    if (fotoUrls.length > 0 && !skipImages) {
      const uploadedUrls: string[] = [];
      for (let photoIndex = 0; photoIndex < fotoUrls.length; photoIndex += 1) {
        const fotoUrl = fotoUrls[photoIndex];
        try {
          const destPath = `productos/${externalId}-${photoIndex}.${guessExtension(fotoUrl)}`;
          const publicUrl = await uploadImageIfNeeded(storage, bucket, fotoUrl, destPath);
          if (publicUrl) uploadedUrls.push(publicUrl);
        } catch (error) {
          advertencias.push({
            fila,
            codigo,
            mensaje: `No se pudo descargar/subir la foto #${photoIndex + 1} (${(error as Error).message})`,
          });
        }
      }

      // Re-crea las imágenes del producto en el orden de las columnas del
      // Excel en cada corrida — simple e idempotente: uploadImageIfNeeded ya
      // evita volver a subir un archivo que no cambió, así que esto no
      // re-descarga nada, solo mantiene la tabla alineada con el Excel.
      if (uploadedUrls.length > 0) {
        await prisma.productImage.deleteMany({ where: { productId: product.id } });
        await prisma.productImage.createMany({
          data: uploadedUrls.map((url, orden) => ({
            productId: product.id,
            url,
            orden,
            textoAlternativo: descripcion,
          })),
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
