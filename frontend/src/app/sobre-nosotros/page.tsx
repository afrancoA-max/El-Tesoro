import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { StaticPage } from "@/components/content/StaticPage";

export const metadata: Metadata = {
  title: `Sobre El Tesoro | ${SITE_NAME}`,
};

export default function SobreNosotrosPage() {
  return (
    <StaticPage title="Sobre El Tesoro">
      <p>
        Almacén El Tesoro ofrece productos para el hogar y la cocina en Guatemala: ollas, sartenes,
        electrodomésticos, cristalería y más.
      </p>
      <h2>Nuestra historia</h2>
      <p>Por definir junto con el negocio.</p>
    </StaticPage>
  );
}
