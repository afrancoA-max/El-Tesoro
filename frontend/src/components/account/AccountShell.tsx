"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui";
import styles from "./AccountShell.module.css";

const NAV_ITEMS = [
  { href: "/cuenta/perfil", label: "Mi perfil" },
  { href: "/cuenta/direcciones", label: "Mis direcciones" },
  { href: "/cuenta/pedidos", label: "Mis pedidos" },
];

export function AccountShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useUser();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <main className={styles.main}>
      <aside className={styles.sidebar}>
        <p className={styles.greeting}>Hola, {user?.nombre.split(" ")[0]}</p>
        <nav className={styles.nav} aria-label="Secciones de mi cuenta">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? styles.navLinkActive : styles.navLink}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" onClick={handleLogout} className={styles.logoutButton}>
          Cerrar sesión
        </Button>
      </aside>
      <section className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </section>
    </main>
  );
}
