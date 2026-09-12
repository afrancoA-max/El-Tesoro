import { ReactNode } from "react";
import { Toast } from "@/components/ui";
import styles from "./StaticPage.module.css";

export interface StaticPageProps {
  title: string;
  draft?: boolean;
  children: ReactNode;
}

// UX-02: páginas de contenido estático (footer + legal) con texto
// provisional mientras el negocio aprueba la redacción final — nunca deben
// llegar a producción sin quitar el aviso de "BORRADOR".
export function StaticPage({ title, draft = true, children }: StaticPageProps) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{title}</h1>
      {draft && (
        <Toast
          className={styles.draft}
          variant="info"
          message="BORRADOR — pendiente de aprobación del negocio. Este texto es provisional."
        />
      )}
      <div className={styles.prose}>{children}</div>
    </main>
  );
}
