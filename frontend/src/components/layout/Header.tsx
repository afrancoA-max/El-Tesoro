"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Header.module.css";
import { MegaMenu } from "./MegaMenu";
import { MobileNav } from "./MobileNav";
import { SearchBar } from "./SearchBar";

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

        <SearchBar />

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Carrito de compras"
            title="Carrito (funcionalidad del Módulo 05, aún no implementada)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
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
