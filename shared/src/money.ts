// Aritmética de dinero sin errores de punto flotante (CAR-05): todo monto
// que entra aquí (texto decimal "129.99" o number) se convierte a centavos
// enteros para sumar/multiplicar, y solo se vuelve texto decimal fijo al
// devolver el resultado. Nunca hacer `Number(precio) * cantidad` a mano —
// `10.1 + 20.2` en JS da `30.299999999999997`.
//
// El backend siempre debe formatear los montos de la API con `fromCents`
// (texto, 2 decimales) para que el cliente reciba un tipo y formato
// consistentes — ver docs/plan/06-checkout.md, las órdenes del Módulo 06
// también deben usar este utilitario.

export type MoneyInput = string | number;

const DECIMALS = 2;
const SCALE = 10 ** DECIMALS;

/** Convierte un monto ("129.99" o 129.99) a centavos enteros. */
export function toCents(value: MoneyInput): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Monto inválido: ${value}`);
    return Math.round(value * SCALE);
  }

  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Monto inválido: "${value}"`);
  }

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [intPart, fracPart = ""] = unsigned.split(".");
  const fracPadded = fracPart.padEnd(DECIMALS, "0").slice(0, DECIMALS);
  const cents = Number(intPart) * SCALE + Number(fracPadded);
  return negative ? -cents : cents;
}

/** Formatea centavos enteros como texto decimal fijo, p. ej. "129.99". */
export function fromCents(cents: number): string {
  const rounded = Math.round(cents);
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const intPart = Math.floor(abs / SCALE);
  const fracPart = String(abs % SCALE).padStart(DECIMALS, "0");
  return `${negative ? "-" : ""}${intPart}.${fracPart}`;
}

/** Multiplica un precio unitario por una cantidad entera y devuelve texto
 * decimal — sin el error de flotantes de `Number(precio) * cantidad`. */
export function multiplyMoney(unitPrice: MoneyInput, quantity: number): string {
  return fromCents(toCents(unitPrice) * quantity);
}

/** Suma una lista de montos (texto o number) y devuelve el total como
 * texto decimal fijo. */
export function sumMoney(values: MoneyInput[]): string {
  return fromCents(values.reduce((sum: number, value) => sum + toCents(value), 0));
}

/** Compara dos montos por su valor exacto en centavos (evita comparar
 * `Number(a) !== Number(b)` cuando ambos vienen de texto). */
export function moneyEquals(a: MoneyInput, b: MoneyInput): boolean {
  return toCents(a) === toCents(b);
}

/** NUEVO-03: menor monto de una lista, como texto decimal fijo — para
 * `precioDesde` entre variantes sin pasar por `Math.min(Number(...))`
 * (pierde el formato de texto que exige el resto de la API). `null` si la
 * lista viene vacía (producto sin variantes con precio). */
export function minMoney(values: MoneyInput[]): string | null {
  if (values.length === 0) return null;
  return fromCents(Math.min(...values.map(toCents)));
}

/** Igual que `minMoney`, pero el mayor monto de la lista. */
export function maxMoney(values: MoneyInput[]): string | null {
  if (values.length === 0) return null;
  return fromCents(Math.max(...values.map(toCents)));
}
