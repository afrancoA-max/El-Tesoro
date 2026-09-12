import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { StaticPage } from "@/components/content/StaticPage";

export const metadata: Metadata = {
  title: `Envíos | ${SITE_NAME}`,
};

export default function EnviosPage() {
  return (
    <StaticPage title="Envíos">
      <p>
        Coordinamos la entrega de tu pedido según tu ubicación dentro de Guatemala. El costo y el
        tiempo estimado de envío se calculan en el checkout antes de confirmar tu compra.
      </p>
      <h2>Zonas de cobertura</h2>
      <p>Por definir junto con el negocio.</p>
      <h2>Tiempos de entrega</h2>
      <p>Por definir junto con el negocio.</p>
    </StaticPage>
  );
}
