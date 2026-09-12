"use client";

import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/format";
import { LinkButton } from "@/components/ui";
import { EmptyState } from "@/components/catalog/EmptyState";
import { CartItemRow } from "@/components/cart/CartItemRow";
import styles from "./page.module.css";

export function CartPageView() {
  const { cart, status, updateQuantity, acknowledgePriceChange, removeItem } = useCart();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Tu carrito</h1>

      {status === "loading" && <p className={styles.stateNote}>Cargando tu carrito…</p>}

      {status === "error" && (
        <p className={styles.stateNote}>No se pudo cargar tu carrito. Intenta recargar la página.</p>
      )}

      {status === "ready" && cart.items.length === 0 && (
        <EmptyState
          title="Tu carrito está vacío"
          description="Explora el catálogo y agrega lo que necesites para tu cocina o tu hogar."
          action={
            <LinkButton href="/" variant="outline" size="sm">
              Ver categorías destacadas
            </LinkButton>
          }
        />
      )}

      {status === "ready" && cart.items.length > 0 && (
        <div className={styles.layout}>
          <div className={styles.items}>
            {cart.items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onQuantityChange={updateQuantity}
                onAcknowledgePriceChange={acknowledgePriceChange}
                onRemove={removeItem}
              />
            ))}
          </div>

          <aside className={styles.summary}>
            <h2 className={styles.summaryTitle}>Resumen</h2>
            <div className={styles.summaryRow}>
              <span>{cart.totalUnidades} {cart.totalUnidades === 1 ? "producto" : "productos"}</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            <p className={styles.summaryNote}>Precios con IVA incluido. El envío se calcula en el checkout.</p>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span className={styles.totalValue}>{formatCurrency(cart.subtotal)}</span>
            </div>
            <LinkButton href="/checkout" variant="primary" size="md" className={styles.checkoutButton}>
              Proceder al checkout
            </LinkButton>
          </aside>
        </div>
      )}
    </main>
  );
}
