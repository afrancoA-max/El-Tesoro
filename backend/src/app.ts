import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";
import { errorHandlerMiddleware } from "./middlewares/errorHandler.middleware";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigins.includes("*") ? true : env.corsOrigins,
    }),
  );
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use("/api", apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
