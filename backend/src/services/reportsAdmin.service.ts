import { Prisma } from "@prisma/client";
import type { SalesReportByCategory, SalesReportByDay, SalesReportTopProduct, SalesReportView } from "@el-tesoro/shared";
import { sumMoney } from "@el-tesoro/shared";
import { prisma } from "../config/prisma";

const salesOrderInclude = {
  items: { include: { variant: { include: { product: { include: { categoria: true } } } } } },
} satisfies Prisma.OrderInclude;

type SalesOrder = Prisma.OrderGetPayload<{ include: typeof salesOrderInclude }>;

// Listo cuando (Módulo 08, punto 5): "El reporte de ventas de un rango de
// fechas cuadra exactamente con las órdenes `paid` de ese rango." Se filtra
// por `pagadoEn` (momento real del pago, no `createdAt` — una orden puede
// crearse un día y pagarse otro) y se excluyen las canceladas: una orden
// pagada y luego cancelada ya no es una venta real, aunque haya tenido
// `pagadoEn`.
async function fetchPaidOrders(desde: Date, hasta: Date): Promise<SalesOrder[]> {
  return prisma.order.findMany({
    where: { pagadoEn: { gte: desde, lte: hasta }, estado: { not: "cancelado" } },
    include: salesOrderInclude,
    orderBy: { pagadoEn: "asc" },
  });
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getSalesSummary(desde: Date, hasta: Date): Promise<SalesReportView> {
  const orders = await fetchPaidOrders(desde, hasta);

  const totalVentas = sumMoney(orders.map((o) => o.total.toString()));
  const unidadesVendidas = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.cantidad, 0), 0);

  const porDiaMap = new Map<string, { totales: string[]; cantidadOrdenes: number }>();
  for (const order of orders) {
    const key = dateKey(order.pagadoEn!);
    const entry = porDiaMap.get(key) ?? { totales: [], cantidadOrdenes: 0 };
    entry.totales.push(order.total.toString());
    entry.cantidadOrdenes += 1;
    porDiaMap.set(key, entry);
  }
  const porDia: SalesReportByDay[] = Array.from(porDiaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, { totales, cantidadOrdenes }]) => ({ fecha, totalVentas: sumMoney(totales), cantidadOrdenes }));

  const porProductoMap = new Map<string, { productoNombre: string; sku: string; unidades: number; totales: string[] }>();
  const porCategoriaMap = new Map<string, { totales: string[]; unidades: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const productKey = item.sku;
      const productEntry = porProductoMap.get(productKey) ?? { productoNombre: item.nombreProducto, sku: item.sku, unidades: 0, totales: [] };
      productEntry.unidades += item.cantidad;
      productEntry.totales.push(item.subtotal.toString());
      porProductoMap.set(productKey, productEntry);

      const categoriaNombre = item.variant?.product.categoria.nombre ?? "Sin categoría";
      const categoriaEntry = porCategoriaMap.get(categoriaNombre) ?? { totales: [], unidades: 0 };
      categoriaEntry.unidades += item.cantidad;
      categoriaEntry.totales.push(item.subtotal.toString());
      porCategoriaMap.set(categoriaNombre, categoriaEntry);
    }
  }

  const productosTop: SalesReportTopProduct[] = Array.from(porProductoMap.values())
    .map((p) => ({ productoNombre: p.productoNombre, sku: p.sku, unidadesVendidas: p.unidades, totalVentas: sumMoney(p.totales) }))
    .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
    .slice(0, 10);

  const porCategoria: SalesReportByCategory[] = Array.from(porCategoriaMap.entries())
    .map(([categoriaNombre, { totales, unidades }]) => ({ categoriaNombre, totalVentas: sumMoney(totales), unidadesVendidas: unidades }))
    .sort((a, b) => Number(b.totalVentas) - Number(a.totalVentas));

  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    totales: { totalVentas, cantidadOrdenes: orders.length, unidadesVendidas },
    porDia,
    productosTop,
    porCategoria,
  };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/// Export a Excel-friendly CSV (mismo rango/filtro que el reporte de arriba,
/// para que el número de filas cuadre con `totales.cantidadOrdenes`).
export async function exportSalesCsv(desde: Date, hasta: Date): Promise<string> {
  const orders = await fetchPaidOrders(desde, hasta);
  const header = ["Número", "Fecha de pago", "Cliente", "Correo", "Estado", "Total"];
  const rows = orders.map((o) => [
    o.numero,
    o.pagadoEn!.toISOString(),
    o.facturacionNombre,
    o.invitadoEmail ?? "",
    o.estado,
    o.total.toFixed(2),
  ]);
  // BOM UTF-8: Excel en Windows abre CSV sin BOM asumiendo Latin-1 y rompe
  // tildes/ñ del nombre del cliente.
  const bom = "﻿";
  return bom + [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}
