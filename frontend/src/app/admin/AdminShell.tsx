"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_PANEL_ROLES, Permission } from "@el-tesoro/shared";
import { useUser } from "@/context/UserContext";
import { fetchAdminMe } from "@/services/adminApi";
import { ApiError } from "@/services/api";
import { ADMIN_NAV_ITEMS } from "./navItems";
import styles from "./AdminShell.module.css";

// Expone los permisos ya resueltos por el shell a cualquier página hija
// (ej. el dashboard filtrando sus tarjetas) — evita que cada página tenga
// que volver a llamar `/admin/me` por su cuenta.
const AdminPermissionsContext = createContext<Permission[]>([]);
export function useAdminPermissions(): Permission[] {
  return useContext(AdminPermissionsContext);
}

// Módulo 08 — plan sección 6: "integrado bajo /admin en la misma app React,
// protegido por rol". Un solo lugar centraliza el guard (nunca confiar solo
// en esto — el backend vuelve a exigir el permiso en cada endpoint, ver
// requirePermission) y el menú, filtrado por lo que ESTE usuario puede
// hacer (shared/src/permissions.ts es la única fuente de verdad de la
// matriz, tanto aquí como en el backend).
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, status } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<Permission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/cuenta/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (status === "authenticated" && user && !ADMIN_PANEL_ROLES.includes(user.role)) {
      router.replace("/");
    }
  }, [status, user, router, pathname]);

  useEffect(() => {
    if (status !== "authenticated" || !user || !ADMIN_PANEL_ROLES.includes(user.role)) return;
    fetchAdminMe()
      .then((me) => setPermissions(me.permissions))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo verificar tu acceso al panel."));
  }, [status, user]);

  const canEnter = status === "authenticated" && user && ADMIN_PANEL_ROLES.includes(user.role);

  if (!canEnter) {
    return (
      <main className={styles.loading}>
        <p>Verificando acceso…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.loading}>
        <p>{error}</p>
      </main>
    );
  }

  if (!permissions) {
    return (
      <main className={styles.loading}>
        <p>Cargando panel…</p>
      </main>
    );
  }

  const visibleItems = ADMIN_NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  return (
    <AdminPermissionsContext.Provider value={permissions}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>Almacén El Tesoro</div>
          <p className={styles.role}>{roleLabel(user!.role)}</p>
          <nav className={styles.nav}>
            {visibleItems.map((item) => (
              <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? styles.navLinkActive : styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className={styles.exit}>
            ← Volver al sitio
          </Link>
        </aside>
        <main className={styles.content}>{children}</main>
      </div>
    </AdminPermissionsContext.Provider>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "staff":
      return "Gerente";
    case "operador":
      return "Operador";
    case "servicio_cliente":
      return "Servicio al cliente";
    default:
      return role;
  }
}
