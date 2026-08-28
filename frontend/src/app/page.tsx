import Link from "next/link";
import styles from "./page.module.css";

// Módulo 01: todavía no hay páginas públicas de negocio (eso es el
// Módulo 03). Este placeholder solo confirma que el layout base (header +
// footer) funciona y enlaza a la referencia visual /dev/design.
export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>El sitio público llega en el Módulo 03</h1>
      <p className={styles.subtitle}>
        Este es el andamiaje del Módulo 01: taxonomía, modelo de catálogo y sistema de diseño.
      </p>
      <Link href="/dev/design" className={styles.link}>
        Ver la referencia visual en /dev/design →
      </Link>
    </main>
  );
}
