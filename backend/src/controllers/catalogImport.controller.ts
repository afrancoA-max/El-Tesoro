import type { NextFunction, Request, Response } from "express";
import * as XLSX from "xlsx";
import { importCatalogFromWorkbook } from "../services/catalogImport.service";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

// Mismo `externalSource` que `scripts/import-catalog.ts` (Módulo 02): subir
// desde el panel el mismo Excel del almacén es idempotente frente a
// corridas anteriores del script de línea de comandos, no un catálogo
// paralelo.
const EXTERNAL_SOURCE = "excel_almacen_2026";

export async function importCatalogController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw AppError.badRequest("FILE_REQUIRED", "Adjunta el archivo Excel en el campo 'archivo'.");

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch {
      throw AppError.badRequest("INVALID_FILE", "El archivo no es un Excel válido.");
    }

    const resumen = await importCatalogFromWorkbook(workbook, {
      bucket: env.productImagesBucket,
      skipImages: req.query.skipImages === "true",
      externalSource: EXTERNAL_SOURCE,
    });
    res.json({ success: true, data: resumen });
  } catch (error) {
    next(error);
  }
}
