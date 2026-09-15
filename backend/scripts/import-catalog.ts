// Importador de catálogo — Módulo 02.
//
// Vía oficial de carga de catálogo hasta que exista el sync con el API real
// de productos del negocio (aún no existe, ver docs/plan/02-api-catalogo.md).
// Módulo 08: la lógica de fila-por-fila vive en
// `src/services/catalogImport.service.ts` (compartida con el botón
// "Importar catálogo" del panel admin) — este script solo lee el archivo de
// disco y llama a esa función.
//
// Lee el Excel real del almacén, filtra a las filas que ya tienen un precio
// numérico real (decisión tomada con el dueño: el 94% del archivo dice
// "Consultar precio" y no se importa hasta tener el dato real), sube las
// fotos a Cloud Storage, y crea/actualiza productos de forma re-ejecutable
// (upsert por externalSource+externalId, nunca duplica).
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
import fs from "node:fs";
import * as XLSX from "xlsx";
import { prisma } from "../src/config/prisma";
import { importCatalogFromWorkbook } from "../src/services/catalogImport.service";

const EXTERNAL_SOURCE = "excel_almacen_2026";
const DEFAULT_FILE = path.resolve(__dirname, "../../productos_almacen_el_tesoro_completo.xlsx");
// INF-08: el bucket real cambia por entorno (staging hoy, producción en el
// Módulo 09) — nunca debe quedar fijo en el código. `--bucket` en la línea
// de comandos sigue ganando sobre esto (ver parseArgs).
const DEFAULT_BUCKET = process.env.PRODUCT_IMAGES_BUCKET ?? "eltesoro-product-images-staging";

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

async function main() {
  const { file, bucket, skipImages } = parseArgs();
  console.log(`Leyendo catálogo desde: ${file}`);
  const workbook = XLSX.readFile(file);

  const resumen = await importCatalogFromWorkbook(workbook, { bucket, skipImages, externalSource: EXTERNAL_SOURCE });

  console.log("\n=== Resumen de importación ===");
  console.log(`Filas en el archivo: ${resumen.filas}`);
  console.log(`Productos nuevos:     ${resumen.productosNuevos}`);
  console.log(`Productos actualizados: ${resumen.productosActualizados}`);
  console.log(`Filas rechazadas:     ${resumen.rechazadas.length}`);
  console.log(`Advertencias:         ${resumen.advertencias.length}`);

  if (resumen.rechazadas.length > 0) {
    console.log("\n--- Filas rechazadas (motivo) ---");
    for (const r of resumen.rechazadas.slice(0, 20)) {
      console.log(`Fila ${r.fila} [${r.codigo}] ${r.descripcion.slice(0, 50)} → ${r.motivo}`);
    }
    if (resumen.rechazadas.length > 20) {
      console.log(`... y ${resumen.rechazadas.length - 20} más (ver import-rechazadas.json)`);
    }
    fs.writeFileSync(path.resolve(__dirname, "import-rechazadas.json"), JSON.stringify(resumen.rechazadas, null, 2), "utf-8");
  }

  if (resumen.advertencias.length > 0) {
    fs.writeFileSync(path.resolve(__dirname, "import-advertencias.json"), JSON.stringify(resumen.advertencias, null, 2), "utf-8");
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
