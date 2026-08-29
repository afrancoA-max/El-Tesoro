import Link from "next/link";
import { ProductListItem } from "@/lib/api-types";
import { ProductCard } from "@/components/catalog/ProductCard";
import styles from "./CategoryRail.module.css";

export interface CategoryRailProps {
  title: string;
  viewAllHref: string;
  products: ProductListItem[];
}

export function CategoryRail({ title, viewAllHref, products }: CategoryRailProps) {
  if (products.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <Link href={viewAllHref} className={styles.viewAll}>
          Ver todo <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className={styles.rail}>
        {products.map((product) => (
          <div key={product.slug} className={styles.item}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
