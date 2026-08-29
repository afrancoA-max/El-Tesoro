import styles from "./BrandsStrip.module.css";

export interface BrandsStripProps {
  brands: string[];
}

// Sin logos reales todavía: el negocio los proveerá más adelante (ver
// conversación del Módulo 03). Mientras tanto se muestra el nombre de marca
// en una placa neutra — nunca un logo inventado — para no mostrar algo que
// parezca oficial sin serlo. Cuando lleguen los logos, esta placa se
// reemplaza por <Image> sin tocar el resto de la sección.
export function BrandsStrip({ brands }: BrandsStripProps) {
  if (brands.length === 0) return null;

  return (
    <section className={styles.section} aria-label="Nuestras marcas">
      <h2 className={styles.title}>Nuestras marcas</h2>
      <div className={styles.row}>
        {brands.map((brand) => (
          <div key={brand} className={styles.tile}>
            {brand}
          </div>
        ))}
      </div>
    </section>
  );
}
