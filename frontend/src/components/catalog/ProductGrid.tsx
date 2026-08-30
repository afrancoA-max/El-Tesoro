import { ProductListItem, SearchResultItem } from "@/lib/api-types";
import { FavoriteItem } from "@/context/FavoritesContext";
import { Skeleton } from "@/components/ui";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "./EmptyState";
import styles from "./ProductGrid.module.css";

export interface ProductGridProps {
  products: (ProductListItem | SearchResultItem | FavoriteItem)[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export function ProductGrid({
  products,
  emptyTitle = "No encontramos productos",
  emptyDescription = "Intenta quitar algunos filtros o busca con otras palabras.",
  emptyAction,
}: ProductGridProps) {
  if (products.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <Skeleton className={styles.skeletonImage} />
          <Skeleton variant="text" style={{ width: "60%" }} />
          <Skeleton variant="text" style={{ width: "90%" }} />
          <Skeleton variant="text" style={{ width: "40%" }} />
        </div>
      ))}
    </div>
  );
}
