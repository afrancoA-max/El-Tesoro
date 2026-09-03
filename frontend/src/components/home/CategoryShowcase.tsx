import Image from "next/image";
import Link from "next/link";
import styles from "./CategoryShowcase.module.css";

export interface CategoryShowcaseItem {
  slug: string;
  nombre: string;
  imagen: string | null;
}

export function CategoryShowcase({ items }: { items: CategoryShowcaseItem[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Comprar por categoría</h2>
      <div className={styles.grid}>
        {items.map((item) => (
          <Link key={item.slug} href={`/categoria/${item.slug}`} className={styles.card}>
            <div className={styles.imageWrap}>
              {item.imagen ? (
                <Image src={item.imagen} alt="" fill sizes="(min-width: 1024px) 176px, (min-width: 640px) 148px, 108px" />
              ) : (
                <div className={styles.placeholder} aria-hidden="true" />
              )}
            </div>
            <span className={styles.name}>{item.nombre}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
