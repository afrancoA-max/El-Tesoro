"use client";

import { ErrorState } from "@/components/catalog/ErrorState";
import styles from "./page.module.css";

export default function CategoryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={styles.main}>
      <ErrorState onRetry={reset} />
    </main>
  );
}
