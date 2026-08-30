export type Role = "customer" | "admin" | "wholesale";

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
