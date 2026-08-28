"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./MobileNav.module.css";
import { NAV_DEPARTMENTS } from "./navigation-data";

export interface MobileNavProps {
  onNavigate: () => void;
}

export function MobileNav({ onNavigate }: MobileNavProps) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  return (
    <nav className={styles.nav} aria-label="Categorías (móvil)">
      {NAV_DEPARTMENTS.map((department) => {
        const isExpanded = expandedSlug === department.slug;
        return (
          <div key={department.slug}>
            <button
              type="button"
              className={styles.departmentButton}
              aria-expanded={isExpanded}
              onClick={() => setExpandedSlug(isExpanded ? null : department.slug)}
            >
              {department.nombre}
              <span
                className={[styles.chevron, isExpanded ? styles.chevronOpen : ""].filter(Boolean).join(" ")}
                aria-hidden="true"
              >
                ›
              </span>
            </button>
            {isExpanded && (
              <div className={styles.categoryList}>
                {department.categorias.map((categoria) => (
                  <Link
                    key={categoria.slug}
                    href={`/categoria/${department.slug}/${categoria.slug}`}
                    className={styles.categoryLink}
                    onClick={onNavigate}
                  >
                    {categoria.nombre}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
