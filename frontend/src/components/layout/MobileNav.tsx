"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./MobileNav.module.css";
import { CategoryNode } from "@/lib/api-types";

export interface MobileNavProps {
  departments: CategoryNode[];
  onNavigate: () => void;
}

export function MobileNav({ departments, onNavigate }: MobileNavProps) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  return (
    <nav className={styles.nav} aria-label="Categorías (móvil)">
      {departments.map((department) => {
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
                {department.children.map((categoria) => (
                  <Link
                    key={categoria.slug}
                    href={`/categoria/${categoria.slug}`}
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
