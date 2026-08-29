import Image from "next/image";
import Link from "next/link";
import buttonStyles from "@/components/ui/Button.module.css";
import styles from "./Hero.module.css";

export interface HeroProps {
  images: string[];
  primaryCategorySlug?: string;
}

// Sin fotografía de marca definitiva todavía (ver docs/plan/03-catalogo-navegable.md
// sección 6, riesgo "contenido visual real"): en vez de banco de imágenes
// genérico, el hero arma un mosaico con fotos reales de producto ya
// cargadas en el catálogo — se reemplaza por fotografía de ambiente cuando
// el negocio la produzca, sin cambiar la estructura.
export function Hero({ images, primaryCategorySlug }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <h1 className={styles.title}>Todo para tu cocina y tu hogar</h1>
        <p className={styles.subtitle}>
          Ollas, sartenes, electrodomésticos, cristalería y más — calidad confiable para el día a
          día de tu cocina, en un solo lugar.
        </p>
        <Link
          href={primaryCategorySlug ? `/categoria/${primaryCategorySlug}` : "/buscar"}
          className={`${buttonStyles.button} ${buttonStyles.primary}`}
        >
          Explorar catálogo
        </Link>
      </div>
      <div className={styles.mosaic}>
        {images.slice(0, 4).map((src, index) => (
          <div key={src + index} className={styles.mosaicTile}>
            <Image src={src} alt="" fill sizes="(min-width: 1024px) 20vw, 40vw" priority={index === 0} />
          </div>
        ))}
      </div>
    </section>
  );
}
