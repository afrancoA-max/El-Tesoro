"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import styles from "./FilterBar.module.css";

const SORT_OPTIONS = [
  { value: "novedad", label: "Novedades" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
];

export interface FilterBarProps {
  marcasDisponibles: string[];
  materialesDisponibles: string[];
  totalResultados: number;
}

// Todo filtro/orden vive en la URL (searchParams), nunca en estado que se
// pierda al recargar — así la página es compartible y recargable con el
// mismo resultado (criterio "Listo cuando" del Módulo 03).
export function FilterBar({ marcasDisponibles, materialesDisponibles, totalResultados }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const precioMin = searchParams.get("precioMin") ?? "";
  const precioMax = searchParams.get("precioMax") ?? "";
  const marca = searchParams.get("marca") ?? "";
  const material = searchParams.get("material") ?? "";
  const disponible = searchParams.get("disponible") ?? "";
  const sort = searchParams.get("sort") ?? "novedad";

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = Boolean(precioMin || precioMax || marca || material || disponible);

  return (
    <div className={styles.wrap}>
      <div className={styles.summary}>
        <p className={styles.count}>
          {totalResultados} {totalResultados === 1 ? "producto" : "productos"}
        </p>
        <Button variant="outline" size="sm" className={styles.toggle} onClick={() => setOpen((v) => !v)}>
          Filtros {hasActiveFilters && <span className={styles.dot} aria-hidden="true" />}
        </Button>
        <label className={styles.sortLabel}>
          Ordenar por
          <select
            className={styles.select}
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={[styles.panel, open ? styles.panelOpen : ""].filter(Boolean).join(" ")}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Precio</span>
          <div className={styles.priceRange}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Mín"
              className={styles.priceInput}
              defaultValue={precioMin}
              onBlur={(event) => updateParams({ precioMin: event.target.value })}
              aria-label="Precio mínimo"
            />
            <span aria-hidden="true">–</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Máx"
              className={styles.priceInput}
              defaultValue={precioMax}
              onBlur={(event) => updateParams({ precioMax: event.target.value })}
              aria-label="Precio máximo"
            />
          </div>
        </div>

        {marcasDisponibles.length > 0 && (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Marca</span>
            <select className={styles.select} value={marca} onChange={(event) => updateParams({ marca: event.target.value })}>
              <option value="">Todas</option>
              {marcasDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}

        {materialesDisponibles.length > 0 && (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Material</span>
            <select
              className={styles.select}
              value={material}
              onChange={(event) => updateParams({ material: event.target.value })}
            >
              <option value="">Todos</option>
              {materialesDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={disponible === "true"}
            onChange={(event) => updateParams({ disponible: event.target.checked ? "true" : null })}
          />
          Solo disponibles
        </label>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateParams({ precioMin: null, precioMax: null, marca: null, material: null, disponible: null })
            }
          >
            Quitar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
