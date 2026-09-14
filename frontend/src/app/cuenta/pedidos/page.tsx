"use client";

import { useEffect, useState } from "react";
import { OrderSummaryView } from "@el-tesoro/shared";
import { ProtectedRoute } from "@/components/account/ProtectedRoute";
import { AccountShell } from "@/components/account/AccountShell";
import { EmptyState } from "@/components/catalog/EmptyState";
import { LinkButton, Badge, Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { listMyOrders } from "@/services/accountApi";
import styles from "./page.module.css";

const ESTADO_LABEL: Record<OrderSummaryView["estado"], string> = {
  pendiente_pago: "Pendiente de pago",
  pagado: "Pagado",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

function estadoBadgeVariant(estado: OrderSummaryView["estado"]) {
  if (estado === "entregado" || estado === "pagado") return "success" as const;
  if (estado === "cancelado") return "danger" as const;
  return "neutral" as const;
}

function PedidosContent() {
  const [orders, setOrders] = useState<OrderSummaryView[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    listMyOrders()
      .then(({ items }) => setOrders(items))
      .catch(() => setError(true));
  }, []);

  return (
    <AccountShell title="Mis pedidos">
      {error && <p className={styles.stateNote}>No pudimos cargar tus pedidos. Intenta recargar la página.</p>}

      {!error && orders === null && <p className={styles.stateNote}>Cargando tus pedidos…</p>}

      {!error && orders !== null && orders.length === 0 && (
        <EmptyState
          title="Todavía no tienes pedidos"
          description="Cuando compres en Almacén El Tesoro, tu historial aparecerá aquí."
          action={
            <LinkButton href="/" variant="outline" size="sm">
              Ir al catálogo
            </LinkButton>
          }
        />
      )}

      {!error && orders !== null && orders.length > 0 && (
        <div className={styles.list}>
          {orders.map((order) => (
            <Card key={order.id} className={styles.card}>
              <div className={styles.header}>
                <strong>{order.numero}</strong>
                <Badge variant={estadoBadgeVariant(order.estado)}>{ESTADO_LABEL[order.estado]}</Badge>
              </div>
              <p className={styles.line}>
                {order.totalUnidades} {order.totalUnidades === 1 ? "producto" : "productos"} ·{" "}
                {new Date(order.createdAt).toLocaleDateString("es-GT")}
              </p>
              <div className={styles.footer}>
                <span className={styles.total}>{formatCurrency(order.total)}</span>
                <LinkButton href={`/checkout/confirmacion/${order.numero}`} variant="outline" size="sm">
                  Ver detalle
                </LinkButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AccountShell>
  );
}

export default function PedidosPage() {
  return (
    <ProtectedRoute>
      <PedidosContent />
    </ProtectedRoute>
  );
}
