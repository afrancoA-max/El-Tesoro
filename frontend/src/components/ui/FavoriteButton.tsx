"use client";

import { useFavorites, FavoriteItem } from "@/context/FavoritesContext";
import styles from "./FavoriteButton.module.css";

export interface FavoriteButtonProps {
  item: FavoriteItem;
  className?: string;
  size?: "sm" | "md";
}

export function FavoriteButton({ item, className, size = "sm" }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(item.slug);

  return (
    <button
      type="button"
      className={[styles.button, size === "md" ? styles.md : "", active ? styles.active : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={active}
      aria-label={active ? `Quitar ${item.nombre} de favoritos` : `Agregar ${item.nombre} a favoritos`}
      title={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      onClick={(event) => {
        // Las tarjetas de producto son <Link>: sin esto, tocar el corazón
        // también navegaría a la ficha del producto.
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(item);
      }}
    >
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </button>
  );
}
