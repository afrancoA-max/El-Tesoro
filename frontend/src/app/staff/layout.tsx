import type { Metadata } from "next";

// INF-09: /staff/inventario es para personal de tienda, no para clientes ni
// buscadores — robots.ts ya lo desalienta, pero un noindex en la propia
// página cubre también a quien llegue por un enlace directo.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
