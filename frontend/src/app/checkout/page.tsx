import { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { EmptyState } from "@/components/catalog/EmptyState";
import { LinkButton } from "@/components/ui";
import styles from "./page.module.css";

// Pantalla "próximamente" interna (docs/plan/05-carrito.md, sección 2): el
// carrito ya entrega "Proceder al checkout", pero el flujo real (datos de
// envío, método de envío, pago) es el Módulo 06 — esta página se reemplaza
// por ese contenido cuando llegue, mismo criterio que /cuenta/pedidos.
export const metadata: Metadata = {
  title: `Checkout | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function CheckoutPage() {
  return (
    <main className={styles.main}>
      <EmptyState
        title="El checkout llega pronto"
        description="Estamos construyendo el pago en línea. Por ahora puedes seguir agregando productos a tu carrito — se guardará para cuando esté listo."
        action={
          <LinkButton href="/carrito" variant="outline" size="sm">
            Volver al carrito
          </LinkButton>
        }
      />
    </main>
  );
}
