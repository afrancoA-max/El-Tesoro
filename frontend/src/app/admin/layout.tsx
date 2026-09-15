import type { Metadata } from "next";
import { AdminShell } from "./AdminShell";

// Mismo criterio que /staff (INF-09): el panel admin no es para clientes ni
// buscadores.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
