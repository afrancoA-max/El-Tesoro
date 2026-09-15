"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminOrderSummaryView, OrderStatus } from "@el-tesoro/shared";
import { Badge, Input, Select, Skeleton, Toast } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import shared from "../shared.module.css";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-GT", { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<AdminOrderSummaryView[] | null>(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<OrderStatus | "">("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .listOrders({ q: q || undefined, estado: estado || undefined, limit: 50 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los pedidos."));
  }, [q, estado]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <div className={shared.header}>
        <h1 className={shared.title}>Pedidos</h1>
      </div>

      <div className={shared.toolbar}>
        <div className={shared.toolbarField}>
          <Input placeholder="Buscar por número, cliente o correo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className={shared.toolbarField}>
          <Select value={estado} onChange={(e) => setEstado(e.target.value as OrderStatus | "")}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && <Toast variant="error" message={error} />}
      {!items && !error && <Skeleton style={{ height: 200 }} />}
      {items && items.length === 0 && (
        <div className={shared.tableWrap}>
          <p className={shared.empty}>No hay pedidos con esos filtros.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/pedidos/${o.id}`} className={shared.rowLink}>
                      {o.numero}
                    </Link>
                  </td>
                  <td>{o.clienteNombre}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>{formatCurrency(o.total)}</td>
                  <td>
                    <Badge variant={ESTADO_BADGE[o.estado]}>{ESTADO_LABEL[o.estado]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
