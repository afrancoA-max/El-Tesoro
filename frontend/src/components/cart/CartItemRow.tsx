"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CartItem } from "@el-tesoro/shared";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/services/api";
import styles from "./CartItemRow.module.css";

// Mismo tope que `backend/src/validators/cart.validator.ts` (MAX_CANTIDAD) —
// solo de forma, para que el stepper no sugiera que se puede seguir
// subiendo más allá de lo que el servidor va a aceptar.
const MAX_CANTIDAD_POR_LINEA = 99;

export interface CartItemRowProps {
  item: CartItem;
  onQuantityChange: (itemId: string, cantidad: number) => Promise<{ limitado: boolean }>;
  onAcknowledgePriceChange: (itemId: string) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  compact?: boolean;
}

export function CartItemRow({ item, onQuantityChange, onAcknowledgePriceChange, onRemove, compact = false }: CartItemRowProps) {
  const [busy, setBusy] = useState(false);
  // CAR-07: antes `changeQuantity`/`remove` no tenían `catch` — si la API
  // fallaba, la promesa se rechazaba sin que el cliente viera nada.
  const [rowError, setRowError] = useState<string | null>(null);
  const [priceNoticeDismissed, setPriceNoticeDismissed] = useState(false);

  const changeQuantity = async (next: number) => {
    if (next < 1 || busy) return;
    setBusy(true);
    setRowError(null);
    try {
      const { limitado } = await onQuantityChange(item.id, next);
      if (limitado) {
        setRowError(`Solo hay ${item.stockDisponible} disponibles; ajustamos la cantidad.`);
      }
    } catch (error) {
      setRowError(error instanceof ApiError ? error.message : "No se pudo actualizar la cantidad.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setRowError(null);
    try {
      await onRemove(item.id);
    } catch (error) {
      setRowError(error instanceof ApiError ? error.message : "No se pudo eliminar el producto.");
      setBusy(false);
    }
  };

  // CAR-11: acepta el precio actual como el nuevo congelado.
  const acceptPriceChange = async () => {
    setPriceNoticeDismissed(true);
    try {
      await onAcknowledgePriceChange(item.id);
    } catch {
      setPriceNoticeDismissed(false);
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
          // CAR-06: el servidor no ajusta la cantidad guardada solo al leer
          // el carrito — el subtotal ya excluye las unidades que exceden el
          // stock (ver cart.service.ts), así que el mensaje pide reducir en
          // vez de afirmar un ajuste que no ocurrió.
          <p className={styles.warning}>
            Solo quedan {item.stockDisponible} disponibles — reduce la cantidad. El subtotal no incluye las unidades de más.
          </p>
        )}
        {item.disponible && !item.stockLimitado && item.cantidad >= Math.min(item.stockDisponible, MAX_CANTIDAD_POR_LINEA) && (
          <p className={styles.notice}>Llegaste al máximo disponible ({Math.min(item.stockDisponible, MAX_CANTIDAD_POR_LINEA)}).</p>
        )}
        {item.precioCambio && !priceNoticeDismissed && (
          <p className={styles.notice}>
            Antes {formatCurrency(item.precioAnteriorCongelado ?? item.precioUnitario)}, ahora {formatCurrency(item.precioUnitario)}.{" "}
            <button type="button" className={styles.acceptPriceButton} onClick={acceptPriceChange} disabled={busy}>
              Entendido
            </button>
          </p>
        )}
        {rowError && <p className={styles.warning}>{rowError}</p>}

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
              disabled={busy || item.cantidad >= Math.min(item.stockDisponible, MAX_CANTIDAD_POR_LINEA)}
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
