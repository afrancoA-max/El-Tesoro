import { Role } from "./auth";

// Módulo 08 — Panel admin. Matriz de permisos por rol: fuente única de
// verdad, usada tanto por el backend (middlewares/permission.middleware.ts,
// para autorizar cada endpoint) como por el frontend (para no ofrecer en el
// menú una acción que el backend igual rechazaría). "admin" no se lista
// explícitamente en ROLE_PERMISSIONS: hasPermission le concede todo siempre,
// para que ningún permiso nuevo se le pueda olvidar agregar al admin.
export type Permission =
  | "catalog:read"
  | "catalog:write"
  | "catalog:import"
  | "inventory:read"
  | "inventory:adjust"
  | "orders:read"
  | "orders:advance"
  | "orders:confirm_payment"
  | "orders:cancel"
  | "reports:read"
  | "settings:read"
  | "settings:write"
  | "users:manage";

// Decisiones del negocio (2026-09-15): "staff" (Gerente) ve catálogo,
// inventario y reportes, pero no toca precios/pedidos ni configuración de
// negocio. "servicio_cliente" confirma pago manual (casos de pago que no
// llegó por webhook) y avanza pedidos hasta enviado. "operador" solo avanza
// pedidos (empaque/despacho) y ajusta inventario, sin ver reportes.
const ROLE_PERMISSIONS: Record<Exclude<Role, "admin" | "customer" | "wholesale">, Permission[]> = {
  staff: ["catalog:read", "inventory:read", "orders:read", "reports:read", "settings:read"],
  operador: ["orders:read", "orders:advance", "inventory:read", "inventory:adjust"],
  servicio_cliente: ["orders:read", "orders:advance", "orders:confirm_payment"],
};

/** Roles con algún acceso al panel admin (para el guard de `/admin` en el frontend). */
export const ADMIN_PANEL_ROLES: Role[] = ["admin", "staff", "operador", "servicio_cliente"];

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "admin") return true;
  const granted = (ROLE_PERMISSIONS as Partial<Record<Role, Permission[]>>)[role];
  return granted?.includes(permission) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  if (role === "admin") {
    return [
      "catalog:read",
      "catalog:write",
      "catalog:import",
      "inventory:read",
      "inventory:adjust",
      "orders:read",
      "orders:advance",
      "orders:confirm_payment",
      "orders:cancel",
      "reports:read",
      "settings:read",
      "settings:write",
      "users:manage",
    ];
  }
  return (ROLE_PERMISSIONS as Partial<Record<Role, Permission[]>>)[role] ?? [];
}
