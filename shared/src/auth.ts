// Módulo 08 — Panel admin: "staff" se usa como el rol "Gerente" (visibilidad
// amplia de solo-lectura, sin varias acciones sensibles); "operador" y
// "servicio_cliente" son roles nuevos, más angostos, pensados para el
// personal que opera el día a día de pedidos/inventario sin ser gerente ni
// admin. Ver shared/src/permissions.ts para qué puede hacer cada uno.
export type Role = "customer" | "admin" | "staff" | "operador" | "servicio_cliente" | "wholesale";

export interface PublicUser {
  id: string;
  email: string;
  nombre: string;
  telefono: string | null;
  nit: string | null;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  alias: string | null;
  nombreDestinatario: string;
  telefono: string;
  departamento: string;
  municipio: string;
  direccion: string;
  referencia: string | null;
  esPredeterminada: boolean;
}
