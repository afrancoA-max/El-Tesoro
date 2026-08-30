"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useUser } from "@/context/UserContext";
import { Skeleton } from "@/components/ui";
import styles from "./ProtectedRoute.module.css";

/// Puerta de las rutas de /cuenta que requieren sesión. La API ya devuelve
/// 401 sin cookie válida (protección real); esto es solo la experiencia de
/// redirigir al login en vez de mostrar una pantalla vacía o un error.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/cuenta/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className={styles.main}>
        <Skeleton style={{ height: 32, width: 240, marginBottom: 16 }} />
        <Skeleton style={{ height: 160 }} />
      </main>
    );
  }

  return <>{children}</>;
}
