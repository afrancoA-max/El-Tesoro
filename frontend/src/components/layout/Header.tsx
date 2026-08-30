"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Header.module.css";
import { MegaMenu } from "./MegaMenu";
import { MobileNav } from "./MobileNav";
import { SearchBar } from "./SearchBar";
import { CategoryNode } from "@/lib/api-types";
import { useUser } from "@/context/UserContext";
import { useFavorites } from "@/context/FavoritesContext";

export interface HeaderProps {
  categoryTree: CategoryNode[];
}

export function Header({ categoryTree }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, status } = useUser();
  const { count: favoritesCount } = useFavorites();

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
          <MegaMenu departments={categoryTree} />
        </div>

        <SearchBar />

        <div className={styles.actions}>
          <Link
            href={status === "authenticated" ? "/cuenta/perfil" : "/cuenta/login"}
            className={styles.accountLink}
            aria-label={status === "authenticated" ? `Mi cuenta — sesión iniciada como ${user!.nombre}` : "Iniciar sesión"}
            title={status === "authenticated" ? `Hola, ${user!.nombre.split(" ")[0]}` : "Iniciar sesión"}
          >
            <span className={styles.accountIconWrap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {status === "authenticated" && <span className={styles.accountDot} aria-hidden="true" />}
            </span>
            <span className={styles.accountLabel}>
              {status === "authenticated" ? user!.nombre.split(" ")[0] : "Iniciar sesión"}
            </span>
          </Link>
          <Link
            href="/favoritos"
            className={styles.iconButton}
            aria-label={favoritesCount > 0 ? `Favoritos (${favoritesCount})` : "Favoritos"}
            title="Favoritos"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>
            {favoritesCount > 0 && (
              <span className={styles.favoritesBadge} aria-hidden="true">
                {favoritesCount > 9 ? "9+" : favoritesCount}
              </span>
            )}
          </Link>
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

      {mobileOpen && <MobileNav departments={categoryTree} onNavigate={() => setMobileOpen(false)} />}
      <div className={styles.brandStripe} aria-hidden="true" />
    </header>
  );
}
