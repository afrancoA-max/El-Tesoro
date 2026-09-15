import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";

/// SEG-06: body-parser (express.json()) lanza un SyntaxError con esta forma
/// cuando el cuerpo de la petición no es JSON válido — antes caía al 500
/// genérico de abajo, aunque el error es del cliente, no del servidor.
function isJsonParseError(error: unknown): boolean {
  return error instanceof SyntaxError && (error as SyntaxError & { type?: string }).type === "entity.parse.failed";
}

export function errorHandlerMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues.map((issue) => issue.message).join("; "),
      },
    });
    return;
  }

  // Módulo 08: subida de imágenes/Excel del panel admin — un archivo
  // demasiado grande o de un tipo no soportado es error del cliente, no del
  // servidor.
  if (error instanceof MulterError) {
    res.status(400).json({ success: false, error: { code: `UPLOAD_${error.code}`, message: error.message } });
    return;
  }
  if (error instanceof Error && /^Formato de imagen no soportado/.test(error.message)) {
    res.status(400).json({ success: false, error: { code: "UNSUPPORTED_IMAGE_TYPE", message: error.message } });
    return;
  }

  if (isJsonParseError(error)) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "El cuerpo de la petición no es JSON válido." },
    });
    return;
  }

  // SEG-06: P2002 (violación de unicidad, ej. doble registro simultáneo o
  // carrito duplicado — ver CAR-09) y P2025 (registro no encontrado) son
  // errores del cliente, no fallas del servidor.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        success: false,
        error: { code: "DUPLICATE", message: "Ya existe un registro con esos datos." },
      });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "El registro no existe." },
      });
      return;
    }
  }

  logger.error({ err: error }, "Error no controlado");
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Ocurrió un error interno." },
  });
}
