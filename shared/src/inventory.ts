// NUEVO-02: "stock vendible" es lo único que se le puede ofrecer a un
// cliente que todavía no tiene nada reservado — cantidadDisponible ya
// incluye unidades que otro checkout en curso (Módulo 06) reservó para sí.
// Leer cantidadDisponible sola para decidir si algo se puede agregar al
// carrito o mostrarse como disponible deja que dos clientes se lleven la
// misma última unidad. Todo el catálogo (carrito, ficha, listados,
// búsqueda) y el trigger de Postgres que mantiene `Product.disponible`
// (ver backend/prisma/migrations/20260914090000_nuevo01_trigger_agregados_producto)
// deben usar este mismo criterio.

export interface StockLike {
  cantidadDisponible: number;
  cantidadReservada: number;
}

/** Cantidad que de verdad se le puede ofrecer a un cliente nuevo. Nunca
 * negativa aunque cantidadReservada supere a cantidadDisponible por algún
 * desajuste transitorio. */
export function stockVendible(inventory: StockLike | null | undefined): number {
  if (!inventory) return 0;
  return Math.max(0, inventory.cantidadDisponible - inventory.cantidadReservada);
}
