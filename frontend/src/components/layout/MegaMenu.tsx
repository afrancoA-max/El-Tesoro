"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./MegaMenu.module.css";
import { CategoryNode } from "@/lib/api-types";

export interface MegaMenuProps {
  departments: CategoryNode[];
}

export function MegaMenu({ departments }: MegaMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(departments[0]?.slug);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activeDepartment = departments.find((department) => department.slug === activeSlug);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (departments.length === 0) return null;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <svg className={styles.triggerIcon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2" width="7" height="7" rx="1.5" />
          <rect x="11" y="2" width="7" height="7" rx="1.5" />
          <rect x="2" y="11" width="7" height="7" rx="1.5" />
          <rect x="11" y="11" width="7" height="7" rx="1.5" />
        </svg>
        Categorías
      </button>

      {open && (
        <div className={styles.panel} role="menu" aria-label="Categorías">
          <div className={styles.departmentList}>
            {departments.map((department) => {
              const isActive = department.slug === activeSlug;
              return (
                <button
                  key={department.slug}
                  type="button"
                  className={[styles.departmentItem, isActive ? styles.departmentItemActive : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => setActiveSlug(department.slug)}
                  onFocus={() => setActiveSlug(department.slug)}
                >
                  {department.nombre}
                  <span aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>

          {activeDepartment && (
            <div className={styles.content}>
              <Link
                href={`/categoria/${activeDepartment.slug}`}
                className={styles.contentHeader}
                onClick={() => setOpen(false)}
              >
                Ver todo en {activeDepartment.nombre} <span aria-hidden="true">→</span>
              </Link>
              {activeDepartment.children.length > 0 ? (
                <div className={styles.categoryGrid}>
                  {activeDepartment.children.map((categoria) => (
                    <Link
                      key={categoria.slug}
                      href={`/categoria/${categoria.slug}`}
                      className={styles.categoryLink}
                      onClick={() => setOpen(false)}
                    >
                      {categoria.nombre}
                      <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                // Departamentos sin subcategorías (ej. Electrodomésticos, que
                // el Excel no desglosa) no tienen nada más que mostrar aquí —
                // sin este texto el panel se ve como si algo no hubiera
                // cargado en vez de ser una decisión de contenido.
                <p className={styles.noSubcategories}>
                  Explora todos los productos disponibles en esta categoría.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
