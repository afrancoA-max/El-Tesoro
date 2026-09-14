import { env } from "../config/env";
import { logger } from "../config/logger";
import { releaseExpiredReservations } from "../services/order.service";

/// Barrido en memoria (una sola instancia — igual criterio que los rate
/// limiters, ver rateLimit.middleware.ts) que libera reservas de stock
/// vencidas. `STOCK_RESERVATION_TTL_MINUTES` y
/// `STOCK_RESERVATION_SWEEP_INTERVAL_MS` permiten acelerar ambos en staging
/// para demostrar la expiración sin esperar 60 minutos reales.
export function startStockReservationSweep(): NodeJS.Timeout {
  const timer = setInterval(() => {
    releaseExpiredReservations().catch((error) => {
      logger.error({ err: error }, "Falló el barrido de reservas de stock expiradas");
    });
  }, env.stockReservationSweepIntervalMs);

  timer.unref();
  return timer;
}
