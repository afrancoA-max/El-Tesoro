"use client";

import { useRef, useState } from "react";
import type { CatalogImportSummaryView } from "@el-tesoro/shared";
import { Button, Toast } from "@/components/ui";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import { useAdminPermissions } from "../AdminShell";
import shared from "../shared.module.css";

export default function AdminImportPage() {
  const permissions = useAdminPermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<CatalogImportSummaryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo Excel primero.");
      return;
    }
    setImporting(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await adminApi.importCatalog(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo importar el archivo.");
    } finally {
      setImporting(false);
    }
  }

  if (!permissions.includes("catalog:import")) {
    return (
      <div>
        <div className={shared.header}>
          <h1 className={shared.title}>Importar catálogo</h1>
        </div>
        <p className={shared.empty}>Tu rol no tiene permiso para importar el catálogo.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={shared.header}>
        <h1 className={shared.title}>Importar catálogo</h1>
      </div>

      <div className={shared.section}>
        <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
          Sube el Excel del almacén (mismo formato que usa el importador de línea de comandos) para crear o actualizar productos en lote.
          Re-subir el mismo archivo es seguro: actualiza los productos existentes en vez de duplicarlos.
        </p>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" disabled={importing} />
        <div className={shared.actions}>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Importando… puede tardar varios minutos" : "Importar"}
          </Button>
        </div>
      </div>

      {error && <Toast variant="error" message={error} />}

      {summary && (
        <div className={shared.section}>
          <h2 className={shared.sectionTitle}>Resumen</h2>
          <div className={shared.statGrid}>
            <div className={shared.statCard}>
              <div className={shared.statLabel}>Filas leídas</div>
              <div className={shared.statValue}>{summary.filas}</div>
            </div>
            <div className={shared.statCard}>
              <div className={shared.statLabel}>Nuevos</div>
              <div className={shared.statValue}>{summary.productosNuevos}</div>
            </div>
            <div className={shared.statCard}>
              <div className={shared.statLabel}>Actualizados</div>
              <div className={shared.statValue}>{summary.productosActualizados}</div>
            </div>
            <div className={shared.statCard}>
              <div className={shared.statLabel}>Rechazadas</div>
              <div className={shared.statValue}>{summary.rechazadas.length}</div>
            </div>
          </div>

          {summary.rechazadas.length > 0 && (
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rechazadas.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      <td>{r.fila}</td>
                      <td>{r.codigo}</td>
                      <td>{r.descripcion}</td>
                      <td>{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
