import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { StaticPage } from "@/components/content/StaticPage";

export const metadata: Metadata = {
  title: `Devoluciones | ${SITE_NAME}`,
};

export default function DevolucionesPage() {
  return (
    <StaticPage title="Devoluciones">
      <p>
        Si tu pedido llegó incompleto, dañado o no corresponde a lo que compraste, puedes
        solicitar un cambio o devolución contactándonos.
      </p>
      <h2>Plazo para solicitar una devolución</h2>
      <p>Por definir junto con el negocio.</p>
      <h2>Condiciones del producto</h2>
      <p>Por definir junto con el negocio.</p>
    </StaticPage>
  );
}
