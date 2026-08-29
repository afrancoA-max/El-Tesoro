import Image from "next/image";
import Link from "next/link";
import { ProductListItem, SearchResultItem } from "@/lib/api-types";
import { formatCurrency } from "@/lib/format";
import { getBrandAccentColor } from "@/lib/brandTheme";
import { Badge } from "@/components/ui";
import styles from "./ProductCard.module.css";

export interface ProductCardProps {
  product: ProductListItem | SearchResultItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const disponible = "disponible" in product ? product.disponible : true;
  const marca = "marca" in product ? product.marca : null;

  return (
    <Link href={`/producto/${product.slug}`} className={styles.card}>
      <div className={styles.imageWrap}>
        {product.imagenPrincipal ? (
          <Image
            src={product.imagenPrincipal}
            alt={product.nombre}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 45vw"
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
        {!disponible && (
          <span className={styles.soldOutBadge}>
            <Badge variant="danger">Agotado</Badge>
          </span>
        )}
      </div>
      <div className={styles.body}>
        {marca && (
          <span
            className={styles.brandLine}
            style={{ backgroundColor: getBrandAccentColor(marca) }}
            aria-hidden="true"
          />
        )}
        {marca && <p className={styles.brand}>{marca}</p>}
        {/* No es <h3>: el grid de tarjetas no siempre tiene un <h2> padre
            (categoría, búsqueda), y forzar uno solo para esto rompería el
            orden de encabezados (heading-order, Compuerta SEO #1). */}
        <p className={styles.name}>{product.nombre}</p>
        <p className={styles.price}>Desde {formatCurrency(product.precioDesde)}</p>
      </div>
    </Link>
  );
}
