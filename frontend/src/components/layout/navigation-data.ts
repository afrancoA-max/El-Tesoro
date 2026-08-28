// Datos de navegación PLACEHOLDER para el layout base del Módulo 01.
// Refleja exactamente la jerarquía DRAFT sembrada en la base de datos (ver
// backend/prisma/seed.ts) — no está aprobada por el negocio todavía. A
// partir del Módulo 02 esto se reemplaza por datos reales consumidos desde
// la API de catálogo (los `slug` ya coinciden con los que genera el seed,
// así que los enlaces no cambian cuando eso pase).
export interface NavCategory {
  slug: string;
  nombre: string;
}

export interface NavDepartment {
  slug: string;
  nombre: string;
  categorias: NavCategory[];
}

export const NAV_DEPARTMENTS: NavDepartment[] = [
  {
    slug: "cocina-y-coccion",
    nombre: "Cocina y Cocción",
    categorias: [
      { slug: "acero-fundido", nombre: "Acero Fundido" },
      { slug: "acero-inoxidable", nombre: "Acero Inoxidable" },
      { slug: "aluminio", nombre: "Aluminio" },
      { slug: "peltre", nombre: "Peltre" },
      { slug: "peltre-chino", nombre: "Peltre Chino" },
      { slug: "peltre-mexicano", nombre: "Peltre Mexicano" },
      { slug: "teflon", nombre: "Teflón" },
    ],
  },
  {
    slug: "electrodomesticos",
    nombre: "Electrodomésticos",
    categorias: [{ slug: "electrodomesticos", nombre: "Electrodomésticos" }],
  },
  {
    slug: "cristaleria-y-menaje-de-mesa",
    nombre: "Cristalería y Menaje",
    categorias: [
      { slug: "cristaleria", nombre: "Cristalería" },
      { slug: "china", nombre: "China" },
      { slug: "cubiertos", nombre: "Cubiertos" },
      { slug: "melamina", nombre: "Melamina" },
      { slug: "acrilico", nombre: "Acrílico" },
      { slug: "plastico", nombre: "Plástico" },
    ],
  },
  {
    slug: "bar-y-barista",
    nombre: "Bar y Barista",
    categorias: [
      { slug: "bar", nombre: "Bar" },
      { slug: "barista", nombre: "Barista" },
      { slug: "hieleras", nombre: "Hieleras" },
      { slug: "thermos", nombre: "Thermos" },
    ],
  },
  {
    slug: "reposteria-y-cocina-auxiliar",
    nombre: "Repostería",
    categorias: [
      { slug: "reposteria", nombre: "Repostería" },
      { slug: "coladores", nombre: "Coladores" },
      { slug: "cuchillos", nombre: "Cuchillos" },
    ],
  },
  {
    slug: "hogar-y-varios",
    nombre: "Hogar y Varios",
    categorias: [
      { slug: "lavado", nombre: "Lavado" },
      { slug: "merceria", nombre: "Mercería" },
      { slug: "tienda", nombre: "Tienda" },
      { slug: "varios", nombre: "Varios" },
    ],
  },
];
