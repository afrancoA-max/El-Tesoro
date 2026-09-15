// Módulo 08: lógica de importación extraída de `scripts/import-catalog.ts`
// (Módulo 02) para que el panel admin pueda ofrecer "Importar catálogo"
// como una acción HTTP (subir el Excel desde el navegador) sin duplicar la
// regla de negocio — el script de línea de comandos ahora solo lee el
// archivo y llama a `importCatalogFromWorkbook`, ver ese archivo.
import * as XLSX from "xlsx";
import { Storage } from "@google-cloud/storage";
import type { CatalogImportSummaryView } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";
import { normalizeText } from "../utils/normalizeText";
import { resolveCategorySlug } from "../utils/categoryMapping";

interface RawRow {
  Código: unknown;
  Descripción: unknown;
  "Precio (Q)": unknown;
  Existencia: unknown;
  Categoría: unknown;
  Marca: unknown;
  "Fotografía (URL)": unknown;
  Material?: unknown;
}

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

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(externalSource: string, base: string, externalId: string): Promise<string> {
  const existingWithSameExternalId = await prisma.product.findUnique({
    where: { externalSource_externalId: { externalSource, externalId } },
    select: { slug: true },
  });
  if (existingWithSameExternalId) return existingWithSameExternalId.slug;

  let candidate = base;
  let suffix = 2;
  while (await prisma.product.findFirst({ where: { slug: candidate, NOT: { externalId } } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function ensureMaterialAttribute(variantId: string, materialRaw: string): Promise<void> {
  const attributeType = await prisma.attributeType.upsert({ where: { nombre: "Material" }, update: {}, create: { nombre: "Material" } });
  const attributeValue = await prisma.attributeValue.upsert({
    where: { attributeTypeId_valor: { attributeTypeId: attributeType.id, valor: materialRaw } },
    update: {},
    create: { attributeTypeId: attributeType.id, valor: materialRaw },
  });
  await prisma.variantAttributeValue.deleteMany({ where: { variantId, attributeValue: { attributeTypeId: attributeType.id } } });
  await prisma.variantAttributeValue.create({ data: { variantId, attributeValueId: attributeValue.id } });
}

function guessExtension(url: string): string {
  const match = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.exec(url);
  return match ? match[1].toLowerCase() : "jpg";
}

async function uploadImageIfNeeded(storage: Storage, bucketName: string, sourceUrl: string, destPath: string): Promise<string | null> {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destPath);
  const [exists] = await file.exists();
  if (!exists) {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status} al descargar la imagen`);
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    await file.save(buffer, { contentType, resumable: false });
  }
  return `https://storage.googleapis.com/${bucketName}/${destPath}`;
}

export interface ImportOptions {
  bucket: string;
  skipImages: boolean;
  /// Distingue el origen de este lote (hoy siempre "excel_almacen_2026" para
  /// el archivo del negocio) — permite en el futuro tener más de una fuente
  /// de Excel sin que sus productos choquen entre sí.
  externalSource: string;
}

export async function importCatalogFromWorkbook(workbook: XLSX.WorkBook, options: ImportOptions): Promise<CatalogImportSummaryView> {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
  const storage = new Storage();

  let productosNuevos = 0;
  let productosActualizados = 0;
  const rechazadas: CatalogImportSummaryView["rechazadas"] = [];
  const advertencias: CatalogImportSummaryView["advertencias"] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const fila = i + 2;
    const row = rows[i];
    const codigo = String(row["Código"] ?? "").trim();
    const descripcion = String(row["Descripción"] ?? "").trim();
    const precioRaw = row["Precio (Q)"];
    const categoriaRaw = String(row["Categoría"] ?? "").trim();
    const marca = row["Marca"] ? String(row["Marca"]).trim() : null;
    const fotoUrls = collectPhotoUrls(row as unknown as Record<string, unknown>);
    const material = row["Material"] ? String(row["Material"]).trim() : null;
    const existenciaRaw = row["Existencia"];
    const existencia = typeof existenciaRaw === "number" && existenciaRaw >= 0 ? Math.floor(existenciaRaw) : 0;

    if (!descripcion) {
      rechazadas.push({ fila, codigo, descripcion, motivo: "Descripción vacía" });
      continue;
    }
    if (typeof precioRaw !== "number") {
      rechazadas.push({ fila, codigo, descripcion, motivo: `Sin precio numérico real (valor: '${String(precioRaw)}')` });
      continue;
    }

    const externalId = String(fila);
    const { slug: categoriaSlug, fuente } = resolveCategorySlug(categoriaRaw, descripcion);
    const categoria = await prisma.category.findUnique({ where: { slug: categoriaSlug } });
    if (!categoria) {
      rechazadas.push({ fila, codigo, descripcion, motivo: `Categoría mapeada '${categoriaSlug}' (desde '${categoriaRaw}') no existe en la base de datos` });
      continue;
    }
    if (fuente === "categoria_desconocida") {
      advertencias.push({ fila, codigo, mensaje: `Categoría real '${categoriaRaw}' sin mapeo conocido — asignada a '${categoriaSlug}' por defecto` });
    }

    const baseSlug = slugify(`${descripcion}-${codigo}`);
    const slug = await ensureUniqueSlug(options.externalSource, baseSlug, externalId);
    const sku = `IMP-${codigo || "SC"}-${externalId}`.toUpperCase();
    const busqueda = normalizeText(`${descripcion} ${marca ?? ""} ${categoria.nombre}`);

    const existing = await prisma.product.findUnique({
      where: { externalSource_externalId: { externalSource: options.externalSource, externalId } },
    });

    const product = await prisma.product.upsert({
      where: { externalSource_externalId: { externalSource: options.externalSource, externalId } },
      update: { nombre: descripcion, descripcionCorta: descripcion.slice(0, 160), marca, categoriaId: categoria.id, estado: "activo", busqueda, rawPayload: row as unknown as object, syncedAt: new Date() },
      create: { slug, nombre: descripcion, descripcionCorta: descripcion.slice(0, 160), marca, categoriaId: categoria.id, estado: "activo", busqueda, externalSource: options.externalSource, externalId, rawPayload: row as unknown as object, syncedAt: new Date() },
    });

    const variant = await prisma.productVariant.upsert({
      where: { sku },
      update: { precio: precioRaw, externalId },
      create: { sku, productId: product.id, precio: precioRaw, externalId, activo: true },
    });

    if (material) await ensureMaterialAttribute(variant.id, material);

    await prisma.inventory.upsert({
      where: { variantId: variant.id },
      update: { cantidadDisponible: existencia },
      create: { variantId: variant.id, cantidadDisponible: existencia, umbralStockBajo: 5 },
    });

    if (fotoUrls.length > 0 && !options.skipImages) {
      const uploadedUrls: string[] = [];
      for (let photoIndex = 0; photoIndex < fotoUrls.length; photoIndex += 1) {
        const fotoUrl = fotoUrls[photoIndex];
        try {
          const destPath = `productos/${externalId}-${photoIndex}.${guessExtension(fotoUrl)}`;
          const publicUrl = await uploadImageIfNeeded(storage, options.bucket, fotoUrl, destPath);
          if (publicUrl) uploadedUrls.push(publicUrl);
        } catch (error) {
          advertencias.push({ fila, codigo, mensaje: `No se pudo descargar/subir la foto #${photoIndex + 1} (${(error as Error).message})` });
        }
      }
      if (uploadedUrls.length > 0) {
        await prisma.productImage.deleteMany({ where: { productId: product.id } });
        await prisma.productImage.createMany({
          data: uploadedUrls.map((url, orden) => ({ productId: product.id, url, orden, textoAlternativo: descripcion })),
        });
      }
    }

    if (existing) productosActualizados += 1;
    else productosNuevos += 1;
  }

  return { filas: rows.length, productosNuevos, productosActualizados, rechazadas, advertencias };
}
