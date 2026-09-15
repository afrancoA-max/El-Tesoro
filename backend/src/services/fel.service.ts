import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

// Mismo patrón que paymentConfig.service.ts para Neonet: el negocio no
// tiene certificador FEL contratado todavía (trámite de afiliación como
// emisor FEL ante SAT, ver docs/plan/07-pagos-en-linea.md sección 6), así
// que este módulo deja el "enchufe" listo — la interfaz correcta
// (`emitirFacturaFEL`) — sin hablar con ningún certificador real. Conectar
// uno más adelante es: (a) poner `fel_habilitado` en true, (b) cargar sus
// credenciales por variable de entorno, (c) reemplazar el cuerpo de esta
// función por la llamada real — order.service.ts no cambia.
const FEL_SETTING_KEY = "fel_habilitado";
const DEFAULT_FEL_ENABLED = false;

export async function isFelEnabled(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({ where: { clave: FEL_SETTING_KEY } });
  if (!setting) return DEFAULT_FEL_ENABLED;
  return setting.valor === "true";
}

/// Nunca lanza: un fallo de FEL no debe tumbar la confirmación de un pago
/// ya cobrado (docs/plan/07 sección 2). Mientras no haya certificador
/// conectado, la orden simplemente queda con `felEstado = "pendiente"`
/// (su valor por defecto) para siempre — no hace falta ni tocarla aquí.
export async function emitirFacturaFEL(orderId: string): Promise<void> {
  const habilitado = await isFelEnabled();
  if (!habilitado) {
    logger.info({ orderId }, "Certificador FEL no configurado todavía: factura queda pendiente.");
    return;
  }

  // Enchufe listo para el certificador real (Infile, Digifact, Megaprint,
  // etc.) cuando exista trámite y credenciales — hoy no hay ninguno
  // conectado, así que no debería poder llegar aquí con `habilitado: true`
  // sin que alguien ya haya implementado el adaptador correspondiente.
  logger.warn({ orderId }, "fel_habilitado está en true pero no hay adaptador de certificador FEL implementado todavía.");
}
