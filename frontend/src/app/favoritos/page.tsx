import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { FavoritesView } from "./FavoritesView";

// Página personal (depende de localStorage del navegador, no de datos de
// servidor) — sin valor de indexación propio, igual que /buscar.
export const metadata: Metadata = {
  title: `Favoritos | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function FavoritosPage() {
  return <FavoritesView />;
}
