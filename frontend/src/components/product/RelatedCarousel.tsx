"use client";

import { useRef, useState, useEffect } from "react";
import { ProductListItem } from "@/lib/api-types";
import { ProductCard } from "@/components/catalog/ProductCard";
import styles from "./RelatedCarousel.module.css";

export interface RelatedCarouselProps {
  products: ProductListItem[];
}

export function RelatedCarousel({ products }: RelatedCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [products]);

  function scrollByAmount(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={[styles.arrow, styles.arrowLeft].join(" ")}
        onClick={() => scrollByAmount(-1)}
        disabled={!canScrollLeft}
        aria-label="Ver productos relacionados anteriores"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className={styles.track} ref={trackRef} onScroll={updateArrows}>
        {products.map((product) => (
          <div key={product.slug} className={styles.item}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <button
        type="button"
        className={[styles.arrow, styles.arrowRight].join(" ")}
        onClick={() => scrollByAmount(1)}
        disabled={!canScrollRight}
        aria-label="Ver más productos relacionados"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
