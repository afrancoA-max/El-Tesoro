"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminOrderDetailView, OrderStatus } from "@el-tesoro/shared";
import { Badge, Button, Input, Skeleton, Toast } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import { useAdminPermissions } from "../../AdminShell";
import shared from "../../shared.module.css";

const ESTADO_LABEL: Record<OrderStatus, string> = {
  pendiente_pago: "Pendiente de pago",
  pagado: "Pagado",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
const ESTADO_BADGE: Record<OrderStatus, "neutral" | "gold" | "navy" | "success" | "danger"> = {
  pendiente_pago: "neutral",
  pagado: "gold",
  en_preparacion: "navy",
  enviado: "navy",
  entregado: "success",
  cancelado: "danger",
};

const NEXT_STEP: Partial<Record<OrderStatus, string>> = {
  pagado: "en_preparacion",
  en_preparacion: "enviado",
  enviado: "entregado",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

export function OrderDetailClient({ id }: { id: string }) {
  const permissions = useAdminPermissions();
  const canConfirmPayment = permissions.includes("orders:confirm_payment");
  const canAdvance = permissions.includes("orders:advance");
  const canCancel = permissions.includes("orders:cancel");
  const [order, setOrder] = useState<AdminOrderDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [guiaEnvio, setGuiaEnvio] = useState("");
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi
      .getOrder(id)
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el pedido."));
  }, [id]);

  useEffect(load, [load]);

  async function handleConfirmPayment() {
    setBusy(true);
    setError(null);
    try {
      await adminApi.confirmPayment(id);
      setMessage("Pago confirmado manualmente.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo confirmar el pago.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance() {
    setBusy(true);
    setError(null);
    try {
      await adminApi.advanceOrder(id, guiaEnvio || undefined);
      setMessage("Pedido avanzado.");
      setGuiaEnvio("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo avanzar el pedido.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!motivoCancelacion.trim()) {
      setError("Indica un motivo de cancelación.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.cancelOrder(id, motivoCancelacion);
      setMessage("Pedido cancelado.");
      setMotivoCancelacion("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cancelar el pedido.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) return <Toast variant="error" message={error} />;
  if (!order) return <Skeleton style={{ height: 300 }} />;

  const nextStatus = NEXT_STEP[order.estado];
  const cancelable = ["pendiente_pago", "pagado", "en_preparacion"].includes(order.estado);

  return (
    <div>
      <Link href="/admin/pedidos" className={shared.backLink}>
        ← Volver a pedidos
      </Link>
      <div className={shared.header}>
        <h1 className={shared.title}>Pedido {order.numero}</h1>
        <Badge variant={ESTADO_BADGE[order.estado]}>{ESTADO_LABEL[order.estado]}</Badge>
      </div>

      {message && <Toast variant="success" message={message} />}
      {error && <Toast variant="error" message={error} />}

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Datos del pedido</h2>
        <p>
          <strong>Cliente:</strong> {order.clienteNombre} {order.clienteEmail ? `(${order.clienteEmail})` : ""}
        </p>
        <p>
          <strong>Facturación:</strong> {order.facturacionNombre} — NIT {order.facturacionNit}
        </p>
        <p>
          <strong>Envío:</strong> {order.metodoEnvioNombre}
          {order.direccionEnvio && ` — ${order.direccionEnvio.direccion}, ${order.direccionEnvio.municipio}, ${order.direccionEnvio.departamento}`}
        </p>
        {order.guiaEnvio && (
          <p>
            <strong>Guía:</strong> {order.guiaEnvio}
          </p>
        )}
        {order.motivoCancelacion && (
          <p>
            <strong>Motivo de cancelación:</strong> {order.motivoCancelacion}
          </p>
        )}
        <p>
          <strong>Total:</strong> {formatCurrency(order.total)}
        </p>
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Líneas</h2>
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombreProducto}</td>
                  <td>{item.sku}</td>
                  <td>{item.cantidad}</td>
                  <td>{formatCurrency(item.precioUnitario)}</td>
                  <td>{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(canConfirmPayment || canAdvance || canCancel) && (
        <div className={shared.section}>
          <h2 className={shared.sectionTitle}>Acciones</h2>
          <div className={shared.actions} style={{ flexWrap: "wrap", marginBottom: "1rem" }}>
            {canConfirmPayment && order.estado === "pendiente_pago" && (
              <Button onClick={handleConfirmPayment} disabled={busy}>
                Confirmar pago manualmente
              </Button>
            )}
            {canAdvance && nextStatus && (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                {nextStatus === "enviado" && (
                  <Input label="Número de guía" value={guiaEnvio} onChange={(e) => setGuiaEnvio(e.target.value)} placeholder="Requerido para enviar" />
                )}
                <Button onClick={handleAdvance} disabled={busy}>
                  Avanzar a {ESTADO_LABEL[nextStatus as OrderStatus]}
                </Button>
              </div>
            )}
          </div>

          {canCancel && cancelable && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
              <Input label="Motivo de cancelación" value={motivoCancelacion} onChange={(e) => setMotivoCancelacion(e.target.value)} />
              <Button variant="danger" onClick={handleCancel} disabled={busy}>
                Cancelar pedido
              </Button>
            </div>
          )}
        </div>
      )}

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Historial</h2>
        <div className={shared.historyList}>
          {order.historial.length === 0 && <p className={shared.empty}>Sin cambios de estado todavía.</p>}
          {order.historial.map((h) => (
            <div key={h.id} className={shared.historyItem}>
              <span>
                {h.estadoAnterior ? `${ESTADO_LABEL[h.estadoAnterior]} → ` : ""}
                {ESTADO_LABEL[h.estadoNuevo]}
                {h.motivo ? ` — ${h.motivo}` : ""}
              </span>
              <span>
                {formatDateTime(h.createdAt)} {h.adminNombre ? `· ${h.adminNombre}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
