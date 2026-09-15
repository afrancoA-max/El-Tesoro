import type { NextFunction, Request, Response } from "express";
import * as reportsAdmin from "../services/reportsAdmin.service";
import { salesReportQuerySchema } from "../validators/reportsAdmin.validator";

// El negocio opera en un solo huso horario, Guatemala (UTC-6, sin horario de
// verano — nunca cambia), así que "el día 15" para el dueño del negocio es
// el día calendario de Guatemala, no el de UTC ni el del servidor. Fijar el
// offset explícito evita dos bugs distintos: (a) `new Date(str).setHours()`
// usa la zona LOCAL del proceso de Node, que en producción/CI puede no ser
// Guatemala; (b) construir los límites en UTC puro corta la noche
// guatemalteca del día siguiente (20:00 GT = 02:00 UTC del día siguiente).
const GUATEMALA_UTC_OFFSET = "-06:00";

function parseRange(query: unknown) {
  const { desde, hasta } = salesReportQuerySchema.parse(query);
  const desdeDate = new Date(`${desde.slice(0, 10)}T00:00:00.000${GUATEMALA_UTC_OFFSET}`);
  const hastaDate = new Date(`${hasta.slice(0, 10)}T23:59:59.999${GUATEMALA_UTC_OFFSET}`);
  return { desdeDate, hastaDate };
}

export async function getSalesSummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    const { desdeDate, hastaDate } = parseRange(req.query);
    res.json({ success: true, data: await reportsAdmin.getSalesSummary(desdeDate, hastaDate) });
  } catch (error) {
    next(error);
  }
}

export async function exportSalesCsvController(req: Request, res: Response, next: NextFunction) {
  try {
    const { desdeDate, hastaDate } = parseRange(req.query);
    const csv = await reportsAdmin.exportSalesCsv(desdeDate, hastaDate);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="ventas_${req.query.desde}_${req.query.hasta}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}
