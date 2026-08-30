"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CartItem } from "@el-tesoro/shared";
import { formatCurrency } from "@/lib/format";
import styles from "./CartItemRow.module.css";

export interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (itemId: string, cantidad: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  compact?: boolean;
}

export function CartItemRow({ item, onQuantityChange, onRemove, compact = false }: CartItemRowProps) {
  const [busy, setBusy] = useState(false);

  const changeQuantity = async (next: number) => {
    if (next < 1 || busy) return;
    setBusy(true);
    try {
      await onQuantityChange(item.id, next);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onRemove(item.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={[styles.row, compact ? styles.compact : "", busy ? styles.busy : ""].filter(Boolean).join(" ")}>
      <Link href={`/producto/${item.productSlug}`} className={styles.imageWrap}>
        {item.imagen ? (
          <Image src={item.imagen} alt={item.nombre} fill sizes="80px" className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}
      </Link>

      <div className={styles.info}>
        <Link href={`/producto/${item.productSlug}`} className={styles.name}>
          {item.nombre}
        </Link>
        {item.atributos.length > 0 && (
          <p className={styles.attrs}>{item.atributos.map((a) => a.valor).join(" · ")}</p>
        )}

        {!item.disponible && <p className={styles.warning}>Ya no está disponible</p>}
        {item.disponible && item.stockLimitado && (
          <p className={styles.warning}>Solo quedan {item.stockDisponible} disponibles — se ajustó la cantidad.</p>
        )}
        {item.precioCambio && <p className={styles.notice}>El precio cambió desde que lo agregaste.</p>}

        <div className={styles.controls}>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepButton}
              onClick={() => changeQuantity(item.cantidad - 1)}
              disabled={busy || item.cantidad <= 1}
              aria-label="Reducir cantidad"
            >
              −
            </button>
            <span className={styles.quantity} aria-live="polite">
              {item.cantidad}
            </span>
            <button
              type="button"
              className={styles.stepButton}
              onClick={() => changeQuantity(item.cantidad + 1)}
              disabled={busy || item.cantidad >= item.stockDisponible}
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
          <button type="button" className={styles.removeButton} onClick={remove} disabled={busy}>
            Eliminar
          </button>
        </div>
      </div>

      <div className={styles.subtotal}>{formatCurrency(item.subtotal)}</div>
    </div>
  );
}
