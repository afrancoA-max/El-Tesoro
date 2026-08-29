"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { searchProducts } from "@/services/catalogService";
import { SearchResultItem } from "@/lib/api-types";
import { formatCurrency } from "@/lib/format";
import styles from "./SearchBar.module.css";

// Autocompletado (fuera del alcance original del Módulo 03, ampliado a
// pedido del negocio): reutiliza GET /search?limit=5 con debounce — no hay
// endpoint dedicado de sugerencias en el backend todavía, así que esto es
// una simulación en el cliente, no una búsqueda con ranking especializado.
export function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  // -1 = nada resaltado, 0..n-1 = una sugerencia, n = "ver todos los resultados"
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounce disparado desde el evento de input (no desde un efecto): el
  // fetch es una reacción directa a que el usuario escribió, no una
  // sincronización con un sistema externo — ver react-hooks/set-state-in-effect.
  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchProducts(value.trim(), { limit: 5 });
        setSuggestions(result.items);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function goToResults() {
    if (query.trim().length < 2) return;
    setOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
  }

  function goToProduct(slug: string) {
    setOpen(false);
    router.push(`/producto/${slug}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    const lastIndex = suggestions.length; // índice de "ver todos"

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i >= lastIndex ? 0 : i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? lastIndex : i - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      if (activeIndex === lastIndex) goToResults();
      else goToProduct(suggestions[activeIndex].slug);
    }
  }

  function highlightMatch(text: string, term: string) {
    const index = text.toLowerCase().indexOf(term.trim().toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <mark className={styles.match}>{text.slice(index, index + term.trim().length)}</mark>
        {text.slice(index + term.trim().length)}
      </>
    );
  }

  return (
    <div className={styles.wrap} ref={wrapperRef}>
      <form
        role="search"
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          goToResults();
        }}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          className={styles.input}
          placeholder="Buscar productos…"
          aria-label="Buscar productos"
          role="combobox"
          aria-expanded={open && query.trim().length >= 2}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </form>

      {open && query.trim().length >= 2 && (
        <div id="search-suggestions" className={styles.dropdown} role="listbox">
          {loading && <p className={styles.hint}>Buscando…</p>}
          {!loading && suggestions.length === 0 && <p className={styles.hint}>Sin resultados para &ldquo;{query}&rdquo;</p>}
          {!loading &&
            suggestions.map((item, index) => (
              <a
                key={item.slug}
                href={`/producto/${item.slug}`}
                className={[styles.suggestion, index === activeIndex ? styles.suggestionActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className={styles.suggestionThumb}>
                  {item.imagenPrincipal && (
                    <Image src={item.imagenPrincipal} alt="" fill sizes="40px" />
                  )}
                </span>
                <span className={styles.suggestionBody}>
                  <span className={styles.suggestionName}>{highlightMatch(item.nombre, query)}</span>
                  <span className={styles.suggestionPrice}>Desde {formatCurrency(item.precioDesde)}</span>
                </span>
              </a>
            ))}
          {!loading && suggestions.length > 0 && (
            <button
              type="button"
              className={[styles.seeAll, activeIndex === suggestions.length ? styles.seeAllActive : ""]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              onClick={goToResults}
            >
              Ver todos los resultados →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
