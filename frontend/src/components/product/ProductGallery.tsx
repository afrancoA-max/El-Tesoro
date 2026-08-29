"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductImage } from "@/lib/api-types";
import styles from "./ProductGallery.module.css";

export interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex];

  if (images.length === 0) {
    return (
      <div className={styles.mainImage}>
        <div className={styles.placeholder} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.mainImage}>
        <Image
          src={active.url}
          alt={active.textoAlternativo || productName}
          fill
          sizes="(min-width: 1024px) 45vw, 90vw"
          priority
          className={styles.image}
        />
      </div>
      {images.length > 1 && (
        <div className={styles.thumbnails} role="tablist" aria-label="Imágenes del producto">
          {images.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={[styles.thumb, index === activeIndex ? styles.thumbActive : ""].filter(Boolean).join(" ")}
              onClick={() => setActiveIndex(index)}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="80px"
                className={styles.thumbImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
