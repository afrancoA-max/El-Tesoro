"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui";
import { CartItemRow } from "./CartItemRow";
import styles from "./CartDrawer.module.css";

export function CartDrawer() {
  const { cart, isDrawerOpen, closeDrawer, updateQuantity, removeItem } = useCart();

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
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
          <button type="button" className={styles.closeButton} onClick={closeDrawer} aria-label="Cerrar carrito">
            ×
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className={styles.empty}>
            <p>Tu carrito está vacío.</p>
            <Link href="/" onClick={closeDrawer}>
              <Button variant="outline" size="sm">
                Ver categorías destacadas
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} onQuantityChange={updateQuantity} onRemove={removeItem} compact />
              ))}
            </div>

            <div className={styles.footer}>
              <div className={styles.subtotalRow}>
                <span>Subtotal</span>
                <span className={styles.subtotalValue}>{formatCurrency(cart.subtotal)}</span>
              </div>
              <p className={styles.footerNote}>Envío e impuestos se calculan en el checkout.</p>
              <Link href="/carrito" onClick={closeDrawer} className={styles.viewCartLink}>
                Ver carrito completo
              </Link>
              <Link href="/checkout" onClick={closeDrawer}>
                <Button variant="primary" size="md" className={styles.checkoutButton}>
                  Proceder al checkout
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
