import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { CartPageView } from "./CartPageView";

// Página personal (contenido depende de la sesión/cookie de carrito de cada
// visitante, no de datos de catálogo indexables) — mismo criterio que /favoritos.
export const metadata: Metadata = {
  title: `Tu carrito | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function CarritoPage() {
  return <CartPageView />;
}
