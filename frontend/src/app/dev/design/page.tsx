import { notFound } from "next/navigation";
import DesignPreview from "./DesignPreview";

// INF-09: /dev/design es solo una referencia visual interna (Módulo 01) —
// no debe quedar accesible ni indexable en producción. robots.ts ya lo
// desalienta para crawlers, pero eso no bloquea el acceso directo; esto sí.
// ENABLE_DESIGN_PREVIEW permite reabrirlo puntualmente en staging si hace
// falta revisar tokens ahí, sin volver a desplegar código distinto.
export default function DesignSystemPage() {
  const enabled = process.env.NODE_ENV !== "production" || process.env.ENABLE_DESIGN_PREVIEW === "true";
  if (!enabled) notFound();

  return <DesignPreview />;
}
