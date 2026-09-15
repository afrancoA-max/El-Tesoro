import { Router } from "express";
import express from "express";
import { secureAcceptanceReceiptController, secureAcceptanceIpnController } from "../../controllers/payments.controller";

/// Rutas que reciben de vuelta las respuestas firmadas de Secure Acceptance
/// (POST-back del navegador y IPN servidor-a-servidor) — Secure Acceptance
/// manda los campos como formulario (`application/x-www-form-urlencoded`),
/// nunca JSON, así que llevan su propio parser en vez del `express.json()`
/// global (ver app.ts). Montadas aparte de `paymentsRouter`: nunca pasan
/// por `optionalAuth` — quien llama es CyberSource o el navegador
/// volviendo de CyberSource, no un cliente autenticado de nuestra API.
export const paymentsReturnRouter = Router();

paymentsReturnRouter.use(express.urlencoded({ extended: false }));

paymentsReturnRouter.post("/receipt", secureAcceptanceReceiptController);
paymentsReturnRouter.post("/ipn", secureAcceptanceIpnController);
