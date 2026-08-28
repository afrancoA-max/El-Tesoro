"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Header.module.css";
import { MegaMenu } from "./MegaMenu";
import { MobileNav } from "./MobileNav";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.logoLink} aria-label="Almacén El Tesoro — inicio">
          <Image
            src="/eltesoro-logo.png"
            alt="Almacén El Tesoro"
            width={160}
            height={160}
            className={styles.logo}
            priority
          />
        </Link>

        <div className={styles.megaMenuSlot}>
          <MegaMenu />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.iconButton} aria-label="Buscar">
            ⌕
          </button>
          <button type="button" className={styles.iconButton} aria-label="Carrito de compras">
            ⛃
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.menuButton}`}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && <MobileNav onNavigate={() => setMobileOpen(false)} />}
    </header>
  );
}
