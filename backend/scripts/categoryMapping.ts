// Mapeo del importador (Módulo 02) entre las categorías "por tipo de
// producto" del Excel real del almacén (58 valores distintos, ver
// docs/plan/02-api-catalogo.md) y las 25 categorías "por material" ya
// aprobadas y sembradas en el Módulo 01 (backend/prisma/seed.ts).
//
// No son taxonomías equivalentes, así que este mapeo es una PROPUESTA a
// revisar por el dueño del negocio, no una verdad definitiva — en especial
// "VAJILLAS", que en el archivo real mezcla baterías de cocina (aluminio),
// vajillas de peltre y vajillas de cerámica bajo el mismo valor.
//
// Estrategia de dos niveles:
//   1. Si la descripción contiene una palabra clave de material, esa gana
//      (más confiable que la columna Categoría del archivo).
//   2. Si no, se usa el mapeo por categoría de abajo.
//   3. Si la categoría no está en el mapeo, cae a "varios" y se reporta
//      como advertencia (no como fila rechazada).

export const KEYWORD_OVERRIDES: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /peltre/, slug: "peltre" },
  { pattern: /porcelana/, slug: "china" },
  { pattern: /pyrex|vidrio/, slug: "cristaleria" },
  { pattern: /acero\s*inox/, slug: "acero-inoxidable" },
  { pattern: /marmol|aluminio|forjado/, slug: "aluminio" },
  { pattern: /plastico/, slug: "plastico" },
  { pattern: /losa|ceramic/, slug: "china" },
];

export const CATEGORY_FALLBACK_MAP: Record<string, string> = {
  JARRILLAS: "peltre",
  JARROS: "varios",
  "JUEGOS DE OLLAS": "aluminio",
  PICHELES: "plastico",
  POCILLOS: "china",
  PYREX: "cristaleria",
  SARTENES: "acero-inoxidable",
  TARROS: "cristaleria",
  "TAZA CON PORCELANA": "china",
  THERMO: "thermos",
  TRASTESITOS: "china",
  VAJILLAS: "aluminio",
  VASOS: "cristaleria",
};

export const DEFAULT_CATEGORY_SLUG = "varios";

export interface CategoryResolution {
  slug: string;
  fuente: "palabra_clave" | "mapeo_categoria" | "categoria_desconocida";
}

export function resolveCategorySlug(rawCategoria: string, descripcion: string): CategoryResolution {
  const descNormalizada = descripcion.toLowerCase();
  for (const { pattern, slug } of KEYWORD_OVERRIDES) {
    if (pattern.test(descNormalizada)) {
      return { slug, fuente: "palabra_clave" };
    }
  }

  const categoriaKey = rawCategoria.trim().toUpperCase();
  const mapped = CATEGORY_FALLBACK_MAP[categoriaKey];
  if (mapped) {
    return { slug: mapped, fuente: "mapeo_categoria" };
  }

  return { slug: DEFAULT_CATEGORY_SLUG, fuente: "categoria_desconocida" };
}
