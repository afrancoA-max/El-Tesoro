"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { OrderView } from "@el-tesoro/shared";
import { LinkButton, Toast } from "@/components/ui";
import { fetchOrder, fetchCheckoutConfig } from "@/services/checkoutApi";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/services/api";
import { useUser } from "@/context/UserContext";
import { PaymentStep } from "../../PaymentStep";
import styles from "./page.module.css";

// Mientras el pago siga `pendiente_pago` sin error todavía, el webhook de
// CyberSource puede tardar unos segundos en llegar — se reconsulta la
// orden a este ritmo en vez de dejar al cliente mirando una pantalla
// estática. Se detiene solo (nunca sigue reintentando para siempre): al
// llegar a `pagado`/`cancelado`, o si aparece un `pagoUltimoError`.
const POLL_INTERVAL_MS = 3000;

export default function OrderConfirmationPage() {
  const params = useParams<{ numero: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? undefined;
  const { user } = useUser();

  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Mismo interruptor "solo cotizar" del wizard — por defecto `false` (el
  // estado real de hoy) si la consulta falla.
  const [pagosEnLineaHabilitado, setPagosEnLineaHabilitado] = useState(false);

  useEffect(() => {
    fetchOrder(params.numero, token)
      .then(({ order: fetched }) => setOrder(fetched))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos encontrar ese pedido."));
  }, [params.numero, token]);

  useEffect(() => {
    fetchCheckoutConfig()
      .then((config) => setPagosEnLineaHabilitado(config.pagosEnLineaHabilitado))
      .catch(() => setPagosEnLineaHabilitado(false));
  }, []);

  // El webhook de CyberSource es la única fuente de verdad del pago (nunca
  // esta pantalla) — mientras no haya llegado, se reconsulta la orden cada
  // pocos segundos. Se detiene solo al salir de `pendiente_pago` o al
  // aparecer un `pagoUltimoError` (ahí se ofrece reintentar en vez de
  // seguir esperando).
  useEffect(() => {
    if (!order || !pagosEnLineaHabilitado) return;
    if (order.estado !== "pendiente_pago" || order.pagoUltimoError) return;

    const timer = setTimeout(() => {
      fetchOrder(params.numero, token)
        .then(({ order: fetched }) => setOrder(fetched))
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [order, pagosEnLineaHabilitado, params.numero, token]);

  if (error) {
    return (
      <main className={styles.main}>
        <Toast variant="error" message={error} />
      </main>
    );
  }

  if (!order) {
    return (
      <main className={styles.main}>
        <p>Cargando tu pedido…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Toast
        variant="success"
        message={pagosEnLineaHabilitado ? `¡Pedido creado! Número ${order.numero}` : `¡Cotización registrada! Número ${order.numero}`}
      />

      <div className={styles.paymentNotice}>
        {pagosEnLineaHabilitado && order.estado === "pagado" && (
          <>
            <h1 className={styles.title}>¡Pago confirmado!</h1>
            <p>
              Tu pedido <strong>{order.numero}</strong> ya está en preparación
              {!user && " — guarda el enlace de esta página, es la única forma de volver a consultarlo sin cuenta"}.
            </p>
            <p className={styles.note}>
              {order.felEstado === "pendiente" && "Tu factura electrónica está en proceso — te la enviaremos por correo."}
              {order.felEstado === "emitida" && order.felPdfUrl && (
                <>
                  Factura electrónica disponible: <a href={order.felPdfUrl}>descargar PDF</a>.
                </>
              )}
              {order.felEstado === "fallida" && "Tuvimos un problema emitiendo tu factura electrónica — nuestro equipo la resolverá."}
            </p>
          </>
        )}

        {pagosEnLineaHabilitado && order.estado === "pendiente_pago" && !order.pagoUltimoError && (
          <>
            <h1 className={styles.title}>Confirmando tu pago…</h1>
            <p>
              Ya enviamos tu cobro a la pasarela de pago. Guarda tu número de pedido <strong>{order.numero}</strong> — esta página se
              actualiza sola en cuanto se confirme.
            </p>
          </>
        )}

        {pagosEnLineaHabilitado && order.estado === "pendiente_pago" && order.pagoUltimoError && (
          <>
            <h1 className={styles.title}>No pudimos cobrar tu pedido</h1>
            <Toast variant="error" message={order.pagoUltimoError} />
            <p>Tu pedido {order.numero} sigue reservado — intenta de nuevo con otra tarjeta.</p>
            <PaymentStep numero={order.numero} accessToken={token} />
          </>
        )}

        {pagosEnLineaHabilitado && order.estado === "cancelado" && (
          <>
            <h1 className={styles.title}>Este pedido ya no está disponible</h1>
            <p>La reserva de stock de {order.numero} expiró antes de completar el pago. Crea un nuevo pedido para volver a comprar.</p>
          </>
        )}

        {!pagosEnLineaHabilitado && (
          <>
            <h1 className={styles.title}>Tu cotización fue registrada</h1>
            <p>
              Nuestro equipo de Almacén El Tesoro te contactará
              {order.invitadoTelefono ? ` al ${order.invitadoTelefono}` : ""} para confirmar el pago y coordinar la entrega. Guarda tu
              número de pedido <strong>{order.numero}</strong>
              {!user && " — sin una cuenta, es la única forma de volver a consultarlo"}.
            </p>
          </>
        )}

        {!user && (
          <p className={styles.note}>
            Enlace para volver a ver este pedido:{" "}
            <code className={styles.code}>
              {typeof window !== "undefined" ? window.location.href : `/checkout/confirmacion/${order.numero}?token=…`}
            </code>
          </p>
        )}
      </div>

      <section className={styles.summaryCard}>
        <h2 className={styles.cardTitle}>Resumen del pedido {order.numero}</h2>
        <ul className={styles.items}>
          {order.items.map((item) => (
            <li key={item.id} className={styles.item}>
              <span>
                {item.nombreProducto} × {item.cantidad}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className={styles.row}>
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className={styles.row}>
          <span>Envío ({order.metodoEnvioNombre})</span>
          <span>{formatCurrency(order.costoEnvio)}</span>
        </div>
        <div className={styles.totalRow}>
          <span>Total (IVA incluido)</span>
          <span className={styles.totalValue}>{formatCurrency(order.total)}</span>
        </div>
        {order.direccionEnvio && (
          <p className={styles.note}>
            Envío a {order.direccionEnvio.direccion}, {order.direccionEnvio.municipio}, {order.direccionEnvio.departamento}.
          </p>
        )}
        {order.fechaExpiracionReserva && (
          <p className={styles.note}>
            Tu stock queda reservado hasta {new Date(order.fechaExpiracionReserva).toLocaleString("es-GT")}.
          </p>
        )}
      </section>

      <div className={styles.actions}>
        {user ? (
          <LinkButton href="/cuenta/pedidos" variant="primary" size="md">
            Ver mis pedidos
          </LinkButton>
        ) : (
          <LinkButton href="/" variant="outline" size="md">
            Volver al catálogo
          </LinkButton>
        )}
      </div>
    </main>
  );
}
