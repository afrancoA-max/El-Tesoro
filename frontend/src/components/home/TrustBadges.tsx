import styles from "./TrustBadges.module.css";

const BADGES = [
  { title: "Envíos a todo Guatemala", description: "Coordinamos entrega según tu ubicación." },
  { title: "Calidad garantizada", description: "Productos seleccionados para uso diario en el hogar." },
  { title: "Atención directa", description: "Te ayudamos a elegir el producto correcto para tu cocina." },
];

export function TrustBadges() {
  return (
    <section className={styles.section} aria-label="Por qué comprar en Almacén El Tesoro">
      {BADGES.map((badge) => (
        <div key={badge.title} className={styles.badge}>
          <h3 className={styles.title}>{badge.title}</h3>
          <p className={styles.description}>{badge.description}</p>
        </div>
      ))}
    </section>
  );
}
