import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { startStockReservationSweep } from "./jobs/stockReservation.job";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`API de catálogo escuchando en el puerto ${env.port} (${env.nodeEnv})`);
});

const stockReservationSweepTimer = startStockReservationSweep();

async function shutdown(signal: string) {
  logger.info(`Recibido ${signal}, cerrando servidor...`);
  clearInterval(stockReservationSweepTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
