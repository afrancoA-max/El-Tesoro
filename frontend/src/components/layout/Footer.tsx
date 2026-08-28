import Image from "next/image";
import { NAV_DEPARTMENTS } from "./navigation-data";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Image
            src="/eltesoro-logo.png"
            alt="Almacén El Tesoro"
            width={160}
            height={160}
            className={styles.logo}
          />
          <p className={styles.tagline}>
            Productos para el hogar y la cocina en Guatemala: ollas, sartenes, electrodomésticos,
            cristalería y más.
          </p>
        </div>

        <div className={styles.columns}>
          <div>
            <p className={styles.columnTitle}>Categorías</p>
            {NAV_DEPARTMENTS.map((department) => (
              <a key={department.slug} className={styles.link} href={`/categoria/${department.slug}`}>
                {department.nombre}
              </a>
            ))}
          </div>
          <div>
            <p className={styles.columnTitle}>Ayuda</p>
            <a className={styles.link} href="#">
              Envíos
            </a>
            <a className={styles.link} href="#">
              Devoluciones
            </a>
            <a className={styles.link} href="#">
              Contacto
            </a>
          </div>
          <div>
            <p className={styles.columnTitle}>Nosotros</p>
            <a className={styles.link} href="#">
              Sobre El Tesoro
            </a>
            <a className={styles.link} href="#">
              Portal mayorista
            </a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>© {new Date().getFullYear()} Almacén El Tesoro. Guatemala.</div>
    </footer>
  );
}
