"use client";

import { useEffect, useState } from "react";
import { Toast } from "./Toast";
import styles from "./QuantityStepper.module.css";

export interface QuantityStepperProps {
  value: number;
  max: number;
  min?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  /** Mensaje que viene de afuera (ej. el servidor recortó la cantidad al
   * guardar) — se muestra con el mismo popup que el límite detectado aquí
   * mismo al escribir o hacer clic en "+". */
  externalNotice?: string | null;
  size?: "sm" | "md";
  label?: string;
}

// Stepper +/- con input de texto: antes solo se podía cambiar la cantidad
// de a un en uno con los botones, sin forma de escribir un número (ej. 12)
// directamente. Reutilizado en la ficha de producto y en cada línea del
// carrito — mismo límite (`max`, el stock real de la variante) y mismo
// aviso "profesional" (Toast, no un <p> suelto) cuando se intenta pasar
// ese límite, sea escribiendo o con el botón "+".
export function QuantityStepper({
  value,
  max,
  min = 1,
  disabled = false,
  onChange,
  externalNotice,
  size = "md",
  label = "Cantidad",
}: QuantityStepperProps) {
  const safeMax = Math.max(min, max);

  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  const [notice, setNotice] = useState<string | null>(null);
  const [lastExternalNotice, setLastExternalNotice] = useState<string | null | undefined>(undefined);
  if (externalNotice !== lastExternalNotice) {
    setLastExternalNotice(externalNotice);
    if (externalNotice) setNotice(externalNotice);
  }

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  function limitMessage() {
    return safeMax <= min ? `Solo hay ${safeMax} disponible.` : `Solo hay ${safeMax} disponibles.`;
  }

  function commit(raw: string) {
    const parsed = Math.trunc(Number(raw));
    if (raw.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    if (parsed > safeMax) {
      setDraft(String(safeMax));
      setNotice(limitMessage());
      if (safeMax !== value) onChange(safeMax);
      return;
    }
    if (parsed < min) {
      setDraft(String(min));
      if (min !== value) onChange(min);
      return;
    }
    setDraft(String(parsed));
    if (parsed !== value) onChange(parsed);
  }

  function step(delta: number) {
    const next = value + delta;
    if (next > safeMax) {
      setNotice(limitMessage());
      return;
    }
    if (next < min) return;
    onChange(next);
  }

  return (
    <div className={styles.wrap}>
      <div className={[styles.stepper, size === "sm" ? styles.sm : ""].filter(Boolean).join(" ")}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => step(-1)}
          disabled={disabled || value <= min}
          aria-label={`Reducir ${label}`}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          className={styles.input}
          value={draft}
          disabled={disabled}
          min={min}
          max={safeMax}
          aria-label={label}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => step(1)}
          disabled={disabled || value >= safeMax}
          aria-label={`Aumentar ${label}`}
        >
          +
        </button>
      </div>

      {notice && (
        <div className={styles.popup}>
          <Toast variant="info" message={notice} />
        </div>
      )}
    </div>
  );
}
