import { Skeleton } from "@/components/ui";
import { ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import styles from "./page.module.css";

export default function SearchLoading() {
  return (
    <main className={styles.main}>
      <Skeleton variant="text" style={{ width: "40%", height: "1.5rem", marginBottom: "1.5rem" }} />
      <ProductGridSkeleton />
    </main>
  );
}
