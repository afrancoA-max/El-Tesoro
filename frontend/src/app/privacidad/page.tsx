import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { StaticPage } from "@/components/content/StaticPage";

export const metadata: Metadata = {
  title: `Política de privacidad | ${SITE_NAME}`,
};

export default function PrivacidadPage() {
  return (
    <StaticPage title="Política de privacidad">
      <p>
        En {SITE_NAME} recopilamos datos como tu nombre, correo electrónico, teléfono y dirección
        de entrega cuando creas una cuenta, realizas una compra o te suscribes a nuestro boletín de
        novedades.
      </p>
      <h2>Para qué usamos tus datos</h2>
      <p>
        Para procesar tus pedidos, coordinar la entrega, contactarte sobre tu compra y, si te
        suscribiste, enviarte ofertas y novedades por correo.
      </p>
      <h2>Con quién compartimos tus datos</h2>
      <p>Por definir junto con el negocio.</p>
      <h2>Cómo puedes darte de baja o eliminar tus datos</h2>
      <p>Por definir junto con el negocio.</p>
    </StaticPage>
  );
}
