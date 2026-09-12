import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { StaticPage } from "@/components/content/StaticPage";

export const metadata: Metadata = {
  title: `Portal mayorista | ${SITE_NAME}`,
};

export default function MayoristaPage() {
  return (
    <StaticPage title="Portal mayorista">
      <p>
        ¿Compras para tu negocio? Contáctanos para conocer precios y condiciones de venta al por
        mayor.
      </p>
      <h2>Cómo aplicar</h2>
      <p>Por definir junto con el negocio.</p>
    </StaticPage>
  );
}
