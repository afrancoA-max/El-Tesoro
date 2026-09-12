import Image from "next/image";
import Link from "next/link";
import { ProductListItem, SearchResultItem } from "@/lib/api-types";
import { FavoriteItem } from "@/context/FavoritesContext";
import { formatCurrency } from "@/lib/format";
import { getBrandAccentColor } from "@/lib/brandTheme";
import { Badge, FavoriteButton } from "@/components/ui";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import styles from "./ProductCard.module.css";

export interface ProductCardProps {
  product: ProductListItem | SearchResultItem | FavoriteItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const disponible = "disponible" in product ? product.disponible : true;
  const marca = "marca" in product ? product.marca : null;
  const varianteUnica = "varianteUnica" in product ? product.varianteUnica : null;
  // CAT-08: "Desde" solo tiene sentido cuando el producto puede tener más de
  // un precio (varias variantes); con una sola variante hay un precio único.
  const tienePrecioUnico = "varianteUnica" in product ? varianteUnica !== null : false;
  const href = `/producto/${product.slug}`;

  return (
    // CAT-08: la tarjeta ya no es un único <a> que envuelve botones
    // (favorito, agregar) — eso es HTML inválido (control interactivo dentro
    // de un enlace) y confunde a lectores de pantalla. El enlace a la ficha
    // vive solo en la imagen y el nombre; los botones quedan fuera.
    <div className={styles.card}>
      <div className={styles.imageWrap}>
        <Link href={href} className={styles.imageLink} aria-label={product.nombre}>
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
        </Link>
        {!disponible && (
          <span className={styles.soldOutBadge}>
            <Badge variant="danger">Agotado</Badge>
          </span>
        )}
        <span className={styles.favoriteSlot}>
          <FavoriteButton
            item={{
              slug: product.slug,
              nombre: product.nombre,
              marca,
              precioDesde: product.precioDesde,
              imagenPrincipal: product.imagenPrincipal,
            }}
          />
        </span>
      </div>
      {marca && (
        <span className={styles.brandLine} style={{ backgroundColor: getBrandAccentColor(marca) }} aria-hidden="true" />
      )}
      <div className={styles.body}>
        {marca && <p className={styles.brand}>{marca}</p>}
        <Link href={href} className={styles.nameLink}>
          {/* No es <h3>: el grid de tarjetas no siempre tiene un <h2> padre
              (categoría, búsqueda), y forzar uno solo para esto rompería el
              orden de encabezados (heading-order, Compuerta SEO #1). */}
          <p className={styles.name}>{product.nombre}</p>
        </Link>
        <p className={styles.price}>
          {tienePrecioUnico ? "" : "Desde "}
          {formatCurrency(product.precioDesde)}
        </p>
        {varianteUnica && (
          <span className={styles.quickAddSlot}>
            <AddToCartButton variantId={varianteUnica.id} nombre={product.nombre} disponible={varianteUnica.disponible} />
          </span>
        )}
      </div>
    </div>
  );
}
