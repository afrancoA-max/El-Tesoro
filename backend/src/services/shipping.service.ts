import type { ShippingCarrier, ShippingMethodCode, ShippingMethodOption } from "@el-tesoro/shared";
import { fromCents, toCents } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";

// Decisión del 14-sep (docs/plan/06-checkout.md sección 6): Cargo Expreso y
// Forza, tarifa por departamento (tabla `shipping_rates`), recoger en tienda
// gratis, envío gratis desde un monto parametrizable en `settings`.
const CARRIERS: { codigo: ShippingCarrier; nombre: string }[] = [
  { codigo: "cargo_expreso", nombre: "Cargo Expreso" },
  { codigo: "forza", nombre: "Forza" },
];

const FREE_SHIPPING_SETTING_KEY = "envio_gratis_umbral";
// Valor inicial confirmado con el negocio (14-sep): Q1000, pero parametrizable
// porque puede variar en ciertos meses — ver Setting en el schema.
const DEFAULT_FREE_SHIPPING_THRESHOLD = "1000.00";

export async function getFreeShippingThreshold(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { clave: FREE_SHIPPING_SETTING_KEY } });
  return setting?.valor ?? DEFAULT_FREE_SHIPPING_THRESHOLD;
}

export async function setFreeShippingThreshold(valor: string): Promise<void> {
  await prisma.setting.upsert({
    where: { clave: FREE_SHIPPING_SETTING_KEY },
    create: { clave: FREE_SHIPPING_SETTING_KEY, valor },
    update: { valor },
  });
}

async function qualifiesForFreeShipping(subtotal: string): Promise<boolean> {
  const umbral = await getFreeShippingThreshold();
  return toCents(subtotal) >= toCents(umbral);
}

/// Métodos de envío disponibles para un departamento y el subtotal actual
/// del carrito — el costo final SIEMPRE se recalcula aquí server-side
/// (nunca se confía en lo que mande el cliente, ver
/// docs/plan/06-checkout.md sección 2 y skill retail-cart-checkout sección 2).
export async function getShippingMethods(departamento: string | null, subtotal: string): Promise<ShippingMethodOption[]> {
  const gratis = await qualifiesForFreeShipping(subtotal);

  const recogerTienda: ShippingMethodOption = {
    codigo: "recoger_tienda",
    nombre: "Recoger en tienda",
    costo: "0.00",
    gratisPorMonto: false,
    disponible: true,
    motivoNoDisponible: null,
  };

  if (!departamento) {
    return [recogerTienda];
  }

  const rates = await prisma.shippingRate.findMany({ where: { departamento } });
  const rateByCarrier = new Map(rates.map((rate) => [rate.transportista, rate]));

  const carrierOptions: ShippingMethodOption[] = CARRIERS.map(({ codigo, nombre }) => {
    const rate = rateByCarrier.get(codigo);
    if (!rate) {
      return {
        codigo,
        nombre,
        costo: "0.00",
        gratisPorMonto: false,
        disponible: false,
        motivoNoDisponible: `${nombre} todavía no cubre el departamento de ${departamento}.`,
      };
    }
    return {
      codigo,
      nombre,
      costo: gratis ? "0.00" : fromCents(toCents(rate.costo.toFixed(2))),
      gratisPorMonto: gratis,
      disponible: true,
      motivoNoDisponible: null,
    };
  });

  return [recogerTienda, ...carrierOptions];
}

export interface ResolvedShipping {
  codigo: ShippingMethodCode;
  nombre: string;
  costo: string;
}

/// Recalcula el costo del método elegido en el servidor al crear la orden —
/// nunca confía en el costo que haya mostrado el cliente en el paso
/// anterior del checkout (puede haber cambiado, o venir manipulado).
export async function resolveShippingCost(
  codigo: ShippingMethodCode,
  departamento: string | null,
  subtotal: string,
): Promise<ResolvedShipping> {
  const options = await getShippingMethods(departamento, subtotal);
  const chosen = options.find((option) => option.codigo === codigo);

  if (!chosen || !chosen.disponible) {
    const nombre = CARRIERS.find((c) => c.codigo === codigo)?.nombre ?? codigo;
    throw new Error(chosen?.motivoNoDisponible ?? `El método de envío "${nombre}" no está disponible para este pedido.`);
  }

  return { codigo: chosen.codigo, nombre: chosen.nombre, costo: chosen.costo };
}
