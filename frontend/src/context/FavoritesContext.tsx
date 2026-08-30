"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

// Favorito mínimo: lo necesario para pintar una tarjeta en /favoritos sin
// tener que volver a pedirle cada producto a la API.
export interface FavoriteItem {
  slug: string;
  nombre: string;
  marca: string | null;
  precioDesde: number;
  imagenPrincipal: string | null;
}

interface FavoritesContextValue {
  favorites: FavoriteItem[];
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

const STORAGE_KEY = "eltesoro:favoritos";

// Guardado solo en este navegador (localStorage), no en el backend: todavía
// no existe un endpoint de favoritos por cuenta (fuera del alcance de este
// módulo). Si más adelante se agrega, este contexto es el único lugar que
// hay que cambiar para sincronizar contra la cuenta del usuario.
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Envuelto en una promesa (no una lectura síncrona directa) por la misma
  // razón que UserContext: react-hooks/set-state-in-effect exige que el
  // setState quede dentro de un callback de promesa, no en el cuerpo
  // síncrono del efecto.
  useEffect(() => {
    Promise.resolve()
      .then(() => {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as FavoriteItem[]) : null;
      })
      .then((parsed) => {
        if (parsed) setFavorites(parsed);
        setHydrated(true);
      })
      .catch(() => {
        // localStorage inaccesible (privado/bloqueado) — se sigue sin favoritos guardados.
        setHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Igual que arriba: si no se puede escribir, la sesión sigue funcionando en memoria.
    }
  }, [favorites, hydrated]);

  const isFavorite = useCallback((slug: string) => favorites.some((f) => f.slug === slug), [favorites]);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites((prev) =>
      prev.some((f) => f.slug === item.slug) ? prev.filter((f) => f.slug !== item.slug) : [item, ...prev],
    );
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, count: favorites.length }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites debe usarse dentro de <FavoritesProvider>.");
  return context;
}
