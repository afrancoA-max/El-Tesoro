import { ReactNode } from "react";
import { Card } from "@/components/ui";
import styles from "./AuthCard.module.css";

export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className={styles.main}>
      <Card className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
        {children}
      </Card>
    </main>
  );
}
