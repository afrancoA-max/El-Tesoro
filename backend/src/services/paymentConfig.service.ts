import { prisma } from "../config/prisma";

// Interruptor confirmado el 14-sep: el negocio no tiene credenciales de
// Neonet todavía, así que el checkout arranca en modo "solo cotizar" (botón
// "Cotizar" en vez de "Pagar" — ver CheckoutPageView.tsx). Activar el pago
// real más adelante es poner este valor en "true" (vía panel/ajustes, o un
// UPDATE directo mientras no exista panel) + cargar las credenciales de
// Neonet en variables de entorno (ver env.ts) + construir el adaptador real
// (Módulo 07) — este módulo solo deja el interruptor y el "enchufe" listos,
// nunca habla con Neonet directamente.
const ONLINE_PAYMENT_SETTING_KEY = "pagos_en_linea_habilitado";
const DEFAULT_ONLINE_PAYMENT_ENABLED = false;

export async function isOnlinePaymentEnabled(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({ where: { clave: ONLINE_PAYMENT_SETTING_KEY } });
  if (!setting) return DEFAULT_ONLINE_PAYMENT_ENABLED;
  return setting.valor === "true";
}

export async function setOnlinePaymentEnabled(enabled: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { clave: ONLINE_PAYMENT_SETTING_KEY },
    create: { clave: ONLINE_PAYMENT_SETTING_KEY, valor: String(enabled) },
    update: { valor: String(enabled) },
  });
}
