import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";
import { errorHandlerMiddleware } from "./middlewares/errorHandler.middleware";

export function createApp() {
  const app = express();

  // SEG-09: la API solo responde JSON (nunca HTML), así que los defaults
  // de helmet (X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
  // etc.) aplican sin necesitar una CSP a medida.
  app.use(helmet());

  app.use(
    cors({
      // Módulo 04 necesita cookies de sesión (credentials), y un navegador
      // nunca las manda con Access-Control-Allow-Origin: "*" — cuando
      // CORS_ORIGINS es "*" (staging) se refleja el origin de cada request
      // en vez de usar `true` literal, para mantener credentials válido.
      origin: env.corsOrigins.includes("*") ? true : env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use("/api", apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
