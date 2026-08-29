import { Skeleton } from "@/components/ui";
import styles from "./page.module.css";

export default function ProductLoading() {
  return (
    <main className={styles.main}>
      <Skeleton variant="text" style={{ width: "40%", margin: "1rem 0" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
        <Skeleton style={{ aspectRatio: "1 / 1" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Skeleton variant="text" style={{ width: "50%" }} />
          <Skeleton variant="text" style={{ width: "80%", height: "2rem" }} />
          <Skeleton variant="text" style={{ width: "30%" }} />
        </div>
      </div>
    </main>
  );
}
