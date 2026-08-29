import Image from "next/image";
import Link from "next/link";
import styles from "./Banner.module.css";

export interface BannerProps {
  title: string;
  subtitle?: string;
  ctaLabel: string;
  href: string;
  image: string | null;
  tone?: "navy" | "gold";
  size?: "full" | "half";
}

// Sin banners de marketing definitivos todavía (mismo riesgo que el hero,
// ver docs/plan/03-catalogo-navegable.md sección 6): usa una foto real de
// producto del catálogo como fondo en vez de un banco de imágenes genérico.
// Se reemplaza por arte de campaña cuando el negocio lo produzca.
export function Banner({ title, subtitle, ctaLabel, href, image, tone = "navy", size = "full" }: BannerProps) {
  return (
    <Link
      href={href}
      className={[styles.banner, styles[tone], styles[size]].join(" ")}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes={size === "full" ? "100vw" : "(min-width: 640px) 50vw, 100vw"}
          className={styles.image}
        />
      )}
      <div className={styles.overlay} />
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <span className={styles.cta}>
          {ctaLabel} <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
