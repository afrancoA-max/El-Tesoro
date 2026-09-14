import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { StaticPage } from "@/components/content/StaticPage";

export const metadata: Metadata = {
  title: `Devoluciones | ${SITE_NAME}`,
};

// Borrador redactado por el Módulo 06 a falta de texto legal final del
// negocio (docs/plan/06-checkout.md sección 6, "decisiones pendientes"): su
// ausencia no bloquea la construcción del checkout, pero sí el lanzamiento
// (Módulo 09) — StaticPage ya marca esta página como BORRADOR.
export default function DevolucionesPage() {
  return (
    <StaticPage title="Devoluciones y garantías">
      <p>
        Si tu pedido llegó incompleto, dañado o no corresponde a lo que compraste, puedes
        solicitar un cambio o devolución contactándonos con tu número de pedido.
      </p>

      <h2>Plazo para solicitar un cambio o devolución</h2>
      <p>
        Tienes 5 días hábiles después de recibir tu pedido para reportar un producto defectuoso,
        incompleto o distinto al comprado.
      </p>

      <h2>Condiciones del producto</h2>
      <p>
        El producto debe estar sin uso, en su empaque original y con todos sus accesorios. No
        aplica a productos usados, instalados o dañados por mal uso.
      </p>

      <h2>Garantía de electrodomésticos</h2>
      <p>
        Los electrodomésticos cuentan con la garantía del fabricante indicada en su empaque o
        manual (generalmente de 6 a 12 meses contra defectos de fabricación). La garantía no cubre
        daños por mal uso, variaciones de voltaje o desgaste normal.
      </p>

      <h2>Cristalería y artículos frágiles</h2>
      <p>
        Revisa tu pedido al recibirlo. Si un artículo de cristalería llega roto o dañado en el
        transporte, repórtalo dentro de las 24 horas siguientes a la entrega, con fotos del
        empaque y del producto, para gestionar el cambio.
      </p>

      <h2>Cómo solicitar tu cambio o devolución</h2>
      <p>
        Escríbenos por los canales de contacto de la tienda indicando tu número de pedido, el
        producto y el motivo. Te confirmaremos los siguientes pasos (cambio, nota de crédito o
        devolución del pago, según el caso).
      </p>
    </StaticPage>
  );
}
