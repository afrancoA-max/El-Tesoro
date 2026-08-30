"use client";

import Link from "next/link";
import { useFavorites } from "@/context/FavoritesContext";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import buttonStyles from "@/components/ui/Button.module.css";
import styles from "./page.module.css";

export function FavoritesView() {
  const { favorites } = useFavorites();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Tus favoritos</h1>
      <p className={styles.subtitle}>
        Se guardan en este navegador — si cambias de dispositivo no los verás ahí todavía.
      </p>
      <ProductGrid
        products={favorites}
        emptyTitle="Aún no tienes favoritos"
        emptyDescription="Toca el corazón en cualquier producto para guardarlo aquí."
        emptyAction={
          <Link href="/" className={`${buttonStyles.button} ${buttonStyles.primary}`}>
            Explorar catálogo
          </Link>
        }
      />
    </main>
  );
}
