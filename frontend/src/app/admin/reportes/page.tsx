"use client";

import { useState } from "react";
import type { SalesReportView } from "@el-tesoro/shared";
import { Button, Input, Skeleton, Toast } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import shared from "../shared.module.css";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function AdminReportsPage() {
  const [desde, setDesde] = useState(firstOfMonthIso());
  const [hasta, setHasta] = useState(todayIso());
  const [report, setReport] = useState<SalesReportView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      setReport(await adminApi.getSalesSummary(desde, hasta));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo generar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className={shared.header}>
        <h1 className={shared.title}>Reportes de ventas</h1>
      </div>

      <div className={shared.toolbar}>
        <div className={shared.toolbarField}>
          <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className={shared.toolbarField}>
          <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generando…" : "Generar reporte"}
        </Button>
        {report && (
          <a href={adminApi.salesExportCsvUrl(desde, hasta)} target="_blank" rel="noreferrer">
            <Button variant="outline">Exportar CSV</Button>
          </a>
        )}
      </div>

      {error && <Toast variant="error" message={error} />}
      {loading && <Skeleton style={{ height: 200 }} />}

      {report && (
        <>
          <div className={shared.statGrid}>
            <div className={shared.statCard}>
              <div className={shared.statLabel}>Ventas totales</div>
              <div className={shared.statValue}>{formatCurrency(report.totales.totalVentas)}</div>
            </div>
            <div className={shared.statCard}>
              <div className={shared.statLabel}>Pedidos pagados</div>
              <div className={shared.statValue}>{report.totales.cantidadOrdenes}</div>
            </div>
            <div className={shared.statCard}>
              <div className={shared.statLabel}>Unidades vendidas</div>
              <div className={shared.statValue}>{report.totales.unidadesVendidas}</div>
            </div>
          </div>

          <div className={shared.section}>
            <h2 className={shared.sectionTitle}>Ventas por día</h2>
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Pedidos</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.porDia.map((d) => (
                    <tr key={d.fecha}>
                      <td>{d.fecha}</td>
                      <td>{d.cantidadOrdenes}</td>
                      <td>{formatCurrency(d.totalVentas)}</td>
                    </tr>
                  ))}
                  {report.porDia.length === 0 && (
                    <tr>
                      <td colSpan={3} className={shared.empty}>
                        Sin ventas en el rango.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={shared.section}>
            <h2 className={shared.sectionTitle}>Productos más vendidos</h2>
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Unidades</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.productosTop.map((p) => (
                    <tr key={p.sku}>
                      <td>{p.productoNombre}</td>
                      <td>{p.sku}</td>
                      <td>{p.unidadesVendidas}</td>
                      <td>{formatCurrency(p.totalVentas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={shared.section}>
            <h2 className={shared.sectionTitle}>Ventas por categoría</h2>
            <div className={shared.tableWrap}>
              <table className={shared.table}>
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Unidades</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.porCategoria.map((c) => (
                    <tr key={c.categoriaNombre}>
                      <td>{c.categoriaNombre}</td>
                      <td>{c.unidadesVendidas}</td>
                      <td>{formatCurrency(c.totalVentas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
