"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { OrderView } from "@el-tesoro/shared";
import { LinkButton, Toast } from "@/components/ui";
import { fetchOrder, fetchCheckoutConfig } from "@/services/checkoutApi";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/services/api";
import { useUser } from "@/context/UserContext";
import styles from "./page.module.css";

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
        {pagosEnLineaHabilitado ? (
          <>
            <h1 className={styles.title}>Método de pago próximamente</h1>
            <p>
              Todavía no procesamos pagos en línea. Guarda tu número de pedido <strong>{order.numero}</strong>
              {!user && " — sin una cuenta, es la única forma de volver a consultarlo"}. En cuanto el pago esté disponible te avisaremos
              cómo continuar.
            </p>
          </>
        ) : (
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
