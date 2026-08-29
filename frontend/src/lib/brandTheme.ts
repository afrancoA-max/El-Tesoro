// Color de acento por marca para la línea sobre el nombre del producto
// (Módulo 03, ficha de producto). Configurable: agregar una marca nueva es
// una línea aquí, sin tocar componentes. La clave se compara en mayúsculas
// para no depender del formato exacto con el que venga `marca` desde la API.
const BRAND_ACCENTS: Record<string, string> = {
  LUCA: "#C0392B",
  TRAMONTINA: "#8B8F94",
};

const DEFAULT_ACCENT = "var(--color-border-strong)";

export function getBrandAccentColor(marca: string | null | undefined): string {
  if (!marca) return DEFAULT_ACCENT;
  return BRAND_ACCENTS[marca.trim().toUpperCase()] ?? DEFAULT_ACCENT;
}
