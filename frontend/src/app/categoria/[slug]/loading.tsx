import { Skeleton } from "@/components/ui";
import { ProductGridSkeleton } from "@/components/catalog/ProductGrid";
import styles from "./page.module.css";

export default function CategoryLoading() {
  return (
    <main className={styles.main}>
      <Skeleton variant="text" style={{ width: "30%", height: "1.5rem", margin: "1rem 0" }} />
      <Skeleton variant="text" style={{ width: "60%", marginBottom: "1.5rem" }} />
      <ProductGridSkeleton />
    </main>
  );
}
