const currencyFormatter = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 2,
});

// NUEVO-03: `precioDesde`/`precioMin`/`precioMax` ahora pueden llegar como
// `null` cuando un producto se queda sin variantes activas con precio —
// acepta null/undefined igual que ya aceptaba un número no finito.
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "";
  return currencyFormatter.format(numeric);
}
