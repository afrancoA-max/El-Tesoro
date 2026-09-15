import type { Permission } from "@el-tesoro/shared";

// Fuente única de las secciones del panel — usada por el menú lateral
// (AdminShell) y por las tarjetas del dashboard (page.tsx), para que ambos
// oculten exactamente lo mismo según el permiso real del usuario (ver
// shared/src/permissions.ts). Antes el dashboard tenía su propia lista sin
// filtrar: un gerente veía la tarjeta "Importar catálogo" y solo se
// enteraba de que no podía usarla al recibir un 403 del backend.
export interface AdminNavItem {
  href: string;
  label: string;
  description: string;
  permission: Permission;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/productos", label: "Catálogo", description: "Crear, editar, publicar o desactivar productos y categorías.", permission: "catalog:read" },
  { href: "/admin/inventario", label: "Inventario", description: "Ver existencias y ajustar stock con motivo.", permission: "inventory:read" },
  { href: "/admin/pedidos", label: "Pedidos", description: "Avanzar el ciclo de un pedido y consultar su historial.", permission: "orders:read" },
  { href: "/admin/reportes", label: "Reportes", description: "Ventas por rango de fechas, exportables a CSV.", permission: "reports:read" },
  { href: "/admin/importar", label: "Importar catálogo", description: "Cargar el Excel del almacén de una sola vez.", permission: "catalog:import" },
  { href: "/admin/usuarios", label: "Usuarios", description: "Crear cuentas de personal interno, asignar rol o desactivarlas.", permission: "users:manage" },
];
