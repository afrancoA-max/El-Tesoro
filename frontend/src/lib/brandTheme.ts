// Color de acento por marca para la línea sobre el nombre del producto
// (Módulo 03, ficha de producto). Configurable: agregar una marca nueva es
// una línea aquí, sin tocar componentes. La clave se compara en mayúsculas
// para no depender del formato exacto con el que venga `marca` desde la API.
const BRAND_ACCENTS: Record<string, string> = {
  LUCA: "#C0392B",
  TRAMONTINA: "#8B8F94",
  ALDURA: "#2E86AB",
  ALINTER: "#8E44AD",
  ALSASA: "#D68910",
  ALUMGUAT: "#16A085",
  "BLACK&DECKER": "#E67E22",
  CHARLIE: "#A04000",
  CHINOS: "#707B7C",
  CINSA: "#1F618D",
  COLEMAN: "#229954",
  COPRODA: "#5D6D7E",
  CRISA: "#4A6274",
  CRISTAR: "#7D3C98",
  "EL TESORO": "#4A4A4A",
  GUATEPLAST: "#148F77",
  IDEAL: "#B9770E",
  JAGUAR: "#943126",
  MAYA: "#117864",
  MEGA: "#6C3483",
  MEXICANA: "#A93226",
  OSTER: "#1A5276",
  PELTRUM: "#7E5109",
  PICCA: "#196F3D",
  PLASTICA: "#839192",
  PLASTICO: "#839192",
  PYRO: "#922B21",
  REGIS: "#21618C",
  TAURUS: "#6E2C00",
  "WEST BEND": "#154360",
  WINCO: "#78281F",
  // "0", "555" y "LICUADORA MAN" no son marcas reales — parecen datos mal
  // mapeados del Excel de origen (ver docs/plan/02-api-catalogo.md). Se
  // dejan fuera a propósito para que caigan al color por defecto en vez de
  // tener un color inventado sin sentido.
};

const DEFAULT_ACCENT = "var(--color-border-strong)";

export function getBrandAccentColor(marca: string | null | undefined): string {
  if (!marca) return DEFAULT_ACCENT;
  return BRAND_ACCENTS[marca.trim().toUpperCase()] ?? DEFAULT_ACCENT;
}
