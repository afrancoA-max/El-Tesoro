"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import buttonStyles from "@/components/ui/Button.module.css";
import { Input } from "@/components/ui/Input";
import inputStyles from "@/components/ui/Input.module.css";
import { Card } from "@/components/ui/Card";
import cardStyles from "@/components/ui/Card.module.css";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import styles from "./design.module.css";

const COLOR_TOKENS: Array<{ name: string; varName: string }> = [
  { name: "Fondo", varName: "--color-bg" },
  { name: "Fondo alterno", varName: "--color-bg-alt" },
  { name: "Superficie", varName: "--color-surface" },
  { name: "Texto primario", varName: "--color-text-primary" },
  { name: "Texto secundario", varName: "--color-text-secondary" },
  { name: "Marca — Azul marino", varName: "--color-navy" },
  { name: "Marca — Dorado", varName: "--color-gold" },
  { name: "Acento — Rojo", varName: "--color-red" },
  { name: "Éxito", varName: "--color-success" },
  { name: "Peligro", varName: "--color-danger" },
  { name: "Borde", varName: "--color-border" },
  { name: "Anillo de foco", varName: "--color-focus-ring" },
];

const SPACE_TOKENS = ["1", "2", "3", "4", "6", "8", "12", "16"];

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className={styles.page}>
      <div className={styles.intro}>
        <h1>Sistema de diseño — /dev/design</h1>
        <p>
          Referencia visual interna del Módulo 01: design tokens y componentes primitivos.
          Ningún color, fuente o espaciado usado aquí está &quot;hardcodeado&quot;: todo referencia
          las variables definidas en <code>src/styles/tokens.css</code>.
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Color</h2>
        <div className={styles.swatchGrid}>
          {COLOR_TOKENS.map((token) => (
            <div className={styles.swatch} key={token.varName}>
              <div className={styles.swatchColor} style={{ background: `var(${token.varName})` }} />
              <div className={styles.swatchLabel}>
                <span className={styles.swatchName}>{token.name}</span>
                <span className={styles.swatchValue}>{token.varName}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tipografía</h2>
        <div className={styles.typeRow}>
          <span className={styles.typeLabel}>2xl / heading</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-size-2xl)" }}>
            Sartén antiadherente
          </span>
        </div>
        <div className={styles.typeRow}>
          <span className={styles.typeLabel}>xl / heading</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-size-xl)" }}>
            Cocina y Cocción
          </span>
        </div>
        <div className={styles.typeRow}>
          <span className={styles.typeLabel}>lg / heading</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-size-lg)" }}>
            Ollas de acero inoxidable
          </span>
        </div>
        <div className={styles.typeRow}>
          <span className={styles.typeLabel}>base / body</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--font-size-base)" }}>
            Sartén de aluminio con recubrimiento antiadherente, apta para todo tipo de estufas.
          </span>
        </div>
        <div className={styles.typeRow}>
          <span className={styles.typeLabel}>sm / body</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--font-size-sm)" }}>
            SKU: SART-CHEF-24-NEG · Disponible
          </span>
        </div>
        <div className={styles.typeRow}>
          <span className={styles.typeLabel}>xs / caption</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--font-size-xs)" }}>
            Peso: 0.85 kg · Categoría: Teflón
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Espaciado</h2>
        <p className={styles.sectionNote}>Escala de 4px, de --space-1 a --space-16.</p>
        {SPACE_TOKENS.map((token) => (
          <div className={styles.spaceRow} key={token}>
            <span className={styles.spaceLabel}>--space-{token}</span>
            <div className={styles.spaceBar} style={{ width: `var(--space-${token})` }} />
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Radios y sombras</h2>
        <div className={styles.tokenGrid}>
          <div className={styles.radiusBox} style={{ borderRadius: "var(--radius-sm)" }}>
            radius-sm
          </div>
          <div className={styles.radiusBox} style={{ borderRadius: "var(--radius-md)" }}>
            radius-md
          </div>
          <div className={styles.radiusBox} style={{ borderRadius: "var(--radius-lg)" }}>
            radius-lg
          </div>
          <div className={styles.radiusBox} style={{ borderRadius: "var(--radius-full)" }}>
            radius-full
          </div>
          <div className={styles.shadowBox} style={{ boxShadow: "var(--shadow-card)" }}>
            shadow-card
          </div>
          <div className={styles.shadowBox} style={{ boxShadow: "var(--shadow-card-hover)" }}>
            shadow-card-hover
          </div>
          <div className={styles.shadowBox} style={{ boxShadow: "var(--shadow-modal)" }}>
            shadow-modal
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Botón</h2>
        <p className={styles.sectionNote}>
          Estados: normal, hover, focus y disabled. (Hover/focus se fuerzan visualmente con una
          clase utilitaria solo para esta página — pruébalos también con mouse/teclado.)
        </p>
        {(["primary", "secondary", "outline", "danger"] as const).map((variant) => (
          <div className={styles.variantGroup} key={variant}>
            <span className={styles.variantGroupTitle}>{variant}</span>
            <div className={styles.stateMatrix}>
              <div className={styles.stateCell}>
                <span className={styles.stateCellLabel}>Normal</span>
                <Button variant={variant}>Agregar al carrito</Button>
              </div>
              <div className={styles.stateCell}>
                <span className={styles.stateCellLabel}>Hover</span>
                <Button variant={variant} className={buttonStyles.forceHover}>
                  Agregar al carrito
                </Button>
              </div>
              <div className={styles.stateCell}>
                <span className={styles.stateCellLabel}>Focus</span>
                <Button variant={variant} className={buttonStyles.forceFocus}>
                  Agregar al carrito
                </Button>
              </div>
              <div className={styles.stateCell}>
                <span className={styles.stateCellLabel}>Disabled</span>
                <Button variant={variant} disabled>
                  Agregar al carrito
                </Button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Input</h2>
        <p className={styles.sectionNote}>Estados: normal, hover, focus, disabled y error.</p>
        <div className={styles.stateMatrix}>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Normal</span>
            <Input label="Correo electrónico" placeholder="tu@correo.com" />
          </div>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Hover</span>
            <Input label="Correo electrónico" placeholder="tu@correo.com" className={inputStyles.forceHover} />
          </div>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Focus</span>
            <Input label="Correo electrónico" placeholder="tu@correo.com" className={inputStyles.forceFocus} />
          </div>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Disabled</span>
            <Input label="Correo electrónico" placeholder="tu@correo.com" disabled />
          </div>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Error</span>
            <Input label="Correo electrónico" defaultValue="no-es-un-correo" errorText="Ingresa un correo válido." />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tarjeta (Card)</h2>
        <p className={styles.sectionNote}>Estados: normal, hover y focus (variante interactiva).</p>
        <div className={styles.stateMatrix}>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Normal</span>
            <Card interactive className={styles.cardDemo}>
              <span className={styles.cardDemoTitle}>Sartén antiadherente Chef</span>
              <span className={styles.cardDemoText}>Q129.00 · 24cm</span>
            </Card>
          </div>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Hover</span>
            <Card interactive className={`${cardStyles.forceHover} ${styles.cardDemo}`}>
              <span className={styles.cardDemoTitle}>Sartén antiadherente Chef</span>
              <span className={styles.cardDemoText}>Q129.00 · 24cm</span>
            </Card>
          </div>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Focus</span>
            <Card interactive className={`${cardStyles.forceFocus} ${styles.cardDemo}`}>
              <span className={styles.cardDemoTitle}>Sartén antiadherente Chef</span>
              <span className={styles.cardDemoText}>Q129.00 · 24cm</span>
            </Card>
          </div>
          <div className={styles.stateCell}>
            <span className={styles.stateCellLabel}>Sin stock</span>
            <Card className={styles.cardDemo} style={{ opacity: 0.6 }}>
              <span className={styles.cardDemoTitle}>Sartén antiadherente Chef</span>
              <Badge variant="danger">Agotado</Badge>
            </Card>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Badge</h2>
        <div className={styles.row}>
          <Badge variant="gold">Nuevo</Badge>
          <Badge variant="navy">Más vendido</Badge>
          <Badge variant="success">En stock</Badge>
          <Badge variant="danger">Agotado</Badge>
          <Badge variant="neutral">Cocina y Cocción</Badge>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Modal</h2>
        <div className={styles.row}>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir modal de ejemplo
          </Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirmar acción">
          <p className={styles.cardDemoText}>
            Este es un modal de ejemplo del sistema de diseño. Cierra con Escape, con el botón × o
            haciendo clic fuera.
          </p>
          <div className={styles.row} style={{ marginTop: "var(--space-4)" }}>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Confirmar
            </Button>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
          </div>
        </Modal>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Toast</h2>
        <div className={styles.row}>
          <Toast variant="info" message="Se guardaron los cambios." />
          <Toast variant="success" message="Producto agregado al carrito." />
          <Toast variant="error" message="No se pudo procesar la solicitud." />
        </div>
      </section>
    </main>
  );
}
