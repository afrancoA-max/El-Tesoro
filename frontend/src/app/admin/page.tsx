"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import { useAdminPermissions } from "./AdminShell";
import { ADMIN_NAV_ITEMS } from "./navItems";
import styles from "./shared.module.css";

export default function AdminHomePage() {
  const permissions = useAdminPermissions();
  const visible = ADMIN_NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Panel de administración</h1>
      </div>
      <div className={styles.statGrid}>
        {visible.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none", color: "inherit" }}>
            <Card style={{ padding: "1.5rem", height: "100%" }} interactive>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-size-lg)", marginBottom: "0.5rem" }}>{s.label}</h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>{s.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
