"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/format";
import { LinkButton } from "@/components/ui";
import { CartItemRow } from "./CartItemRow";
import styles from "./CartDrawer.module.css";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
  const { cart, isDrawerOpen, closeDrawer, updateQuantity, acknowledgePriceChange, removeItem } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // UX-03: al abrirse, el foco debe entrar al drawer (no quedarse en lo que
  // había detrás); al cerrarse, debe volver a lo que el usuario tenía
  // enfocado antes de abrirlo.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      // Con Tab no se debe poder navegar detrás del overlay: el foco se
      // mantiene dando vueltas dentro del drawer.
      if (event.key === "Tab" && drawerRef.current) {
        const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <div className={styles.overlay} onClick={closeDrawer} role="presentation">
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="cart-drawer-title" className={styles.title}>
            Tu carrito {cart.totalUnidades > 0 && `(${cart.totalUnidades})`}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={closeDrawer}
            aria-label="Cerrar carrito"
          >
            ×
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className={styles.empty}>
            <p>Tu carrito está vacío.</p>
            <LinkButton href="/" onClick={closeDrawer} variant="outline" size="sm">
              Ver categorías destacadas
            </LinkButton>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onQuantityChange={updateQuantity}
                  onAcknowledgePriceChange={acknowledgePriceChange}
                  onRemove={removeItem}
                  compact
                />
              ))}
            </div>

            <div className={styles.footer}>
              <div className={styles.subtotalRow}>
                <span>Subtotal</span>
                <span className={styles.subtotalValue}>{formatCurrency(cart.subtotal)}</span>
              </div>
              <p className={styles.footerNote}>Precios con IVA incluido. El envío se calcula en el checkout.</p>
              <Link href="/carrito" onClick={closeDrawer} className={styles.viewCartLink}>
                Ver carrito completo
              </Link>
              <LinkButton
                href="/checkout"
                onClick={closeDrawer}
                variant="primary"
                size="md"
                className={styles.checkoutButton}
              >
                Proceder al checkout
              </LinkButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
