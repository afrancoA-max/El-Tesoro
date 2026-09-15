"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminInventoryItemView } from "@el-tesoro/shared";
import { Badge, Button, Input, Modal, Select, Skeleton, Textarea, Toast } from "@/components/ui";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import { useAdminPermissions } from "../AdminShell";
import shared from "../shared.module.css";

function AdjustForm({ item, onDone }: { item: AdminInventoryItemView; onDone: () => void }) {
  const [delta, setDelta] = useState("0");
  const [motivo, setMotivo] = useState<"recepcion" | "merma" | "correccion">("recepcion");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const deltaNum = Number(delta);
    if (!Number.isInteger(deltaNum) || deltaNum === 0) {
      setError("Indica un ajuste distinto de cero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.adjustStock(item.variantId, { delta: deltaNum, motivo, notas: notas || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo ajustar el stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={shared.form} onSubmit={handleSubmit}>
      <p>
        <strong>{item.productoNombre}</strong> — SKU {item.sku}
        <br />
        Disponible actual: {item.cantidadDisponible}
      </p>
      <Input
        label="Ajuste (usa negativo para restar, ej. -3)"
        type="number"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        required
      />
      <Select label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value as typeof motivo)}>
        <option value="recepcion">Recepción de mercadería</option>
        <option value="merma">Merma / daño</option>
        <option value="correccion">Corrección de conteo</option>
      </Select>
      <Textarea label="Notas (opcional)" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
      {error && <Toast variant="error" message={error} />}
      <div className={shared.actions}>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Aplicar ajuste"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminInventoryPage() {
  const permissions = useAdminPermissions();
  const canAdjust = permissions.includes("inventory:adjust");
  const [items, setItems] = useState<AdminInventoryItemView[] | null>(null);
  const [q, setQ] = useState("");
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<AdminInventoryItemView | null>(null);

  const load = useCallback(() => {
    adminApi
      .listInventory({ q: q || undefined, soloStockBajo, limit: 50 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el inventario."));
  }, [q, soloStockBajo]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <div className={shared.header}>
        <h1 className={shared.title}>Inventario</h1>
      </div>

      <div className={shared.toolbar}>
        <div className={shared.toolbarField}>
          <Input placeholder="Buscar por SKU o producto…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--font-size-sm)" }}>
          <input type="checkbox" checked={soloStockBajo} onChange={(e) => setSoloStockBajo(e.target.checked)} />
          Solo stock bajo
        </label>
      </div>

      {message && <Toast variant="success" message={message} />}
      {error && <Toast variant="error" message={error} />}

      {!items && <Skeleton style={{ height: 200 }} />}
      {items && items.length === 0 && (
        <div className={shared.tableWrap}>
          <p className={shared.empty}>Sin resultados.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Categoría</th>
                <th>Disponible</th>
                <th>Reservado</th>
                <th>Umbral bajo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.variantId}>
                  <td>{item.productoNombre}</td>
                  <td>{item.sku}</td>
                  <td>{item.categoria}</td>
                  <td>
                    {item.cantidadDisponible}
                    {item.stockBajo && (
                      <Badge variant="gold" style={{ marginLeft: "0.5rem" }}>
                        Stock bajo
                      </Badge>
                    )}
                  </td>
                  <td>{item.cantidadReservada}</td>
                  <td>{item.umbralStockBajo}</td>
                  <td>
                    {canAdjust && (
                      <Button variant="outline" size="sm" onClick={() => setAdjusting(item)}>
                        Ajustar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title="Ajustar stock">
        {adjusting && (
          <AdjustForm
            item={adjusting}
            onDone={() => {
              setAdjusting(null);
              setMessage("Ajuste aplicado.");
              load();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
