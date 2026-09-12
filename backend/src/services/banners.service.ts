import { prisma } from "../config/prisma";

export interface BannerSummary {
  id: string;
  titulo: string;
  subtitulo: string | null;
  imagenUrl: string;
  enlace: string;
  orden: number;
}

// CAT-06: banners activos y dentro de su ventana de vigencia (si tienen
// fechaInicio/fechaFin) — administrados con `npm run manage-banners`, sin
// panel admin. Si esto devuelve vacío, el home cae a su comportamiento
// automático anterior (bloques armados con fotos de producto).
export async function getActiveBanners(): Promise<BannerSummary[]> {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      activo: true,
      AND: [
        { OR: [{ fechaInicio: null }, { fechaInicio: { lte: now } }] },
        { OR: [{ fechaFin: null }, { fechaFin: { gte: now } }] },
      ],
    },
    orderBy: { orden: "asc" },
  });

  return banners.map((b) => ({
    id: b.id,
    titulo: b.titulo,
    subtitulo: b.subtitulo,
    imagenUrl: b.imagenUrl,
    enlace: b.enlace,
    orden: b.orden,
  }));
}
