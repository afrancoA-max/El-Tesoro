import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { StaticPage } from "@/components/content/StaticPage";

export const metadata: Metadata = {
  title: `Contacto | ${SITE_NAME}`,
};

export default function ContactoPage() {
  return (
    <StaticPage title="Contacto">
      <p>¿Tienes dudas sobre un producto o un pedido? Escríbenos y te ayudamos.</p>
      <h2>Correo</h2>
      <p>Por definir junto con el negocio.</p>
      <h2>Teléfono / WhatsApp</h2>
      <p>Por definir junto con el negocio.</p>
      <h2>Horario de atención</h2>
      <p>Por definir junto con el negocio.</p>
    </StaticPage>
  );
}
