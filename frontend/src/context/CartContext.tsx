"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Cart } from "@el-tesoro/shared";
import { fetchCart, addCartItem, updateCartItem, removeCartItem, mergeCart } from "@/services/cartApi";
import { useUser } from "@/context/UserContext";

const EMPTY_CART: Cart = { id: null, items: [], subtotal: 0, totalUnidades: 0 };

interface CartContextValue {
  cart: Cart;
  status: "loading" | "ready" | "error";
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (variantId: string, cantidad?: number) => Promise<{ limitado: boolean }>;
  updateQuantity: (itemId: string, cantidad: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// Estado global de cliente (Context, no Zustand — mismo criterio que
// UserContext: un solo valor que pocos componentes leen). La fuente de
// verdad real vive en el backend (retail-cart-checkout sección 1); este
// contexto es un espejo que se re-sincroniza tras cada mutación con la
// respuesta del servidor, nunca calcula totales por su cuenta.
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const { status: sessionStatus } = useUser();
  const mergedForSession = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const current = await fetchCart();
      setCart(current);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchCart()
      .then((current) => {
        setCart(current);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Fusión anónimo → cuenta (docs/plan/05-carrito.md punto 2): se dispara
  // una vez por sesión de navegador cuando el usuario queda autenticado
  // (login recién hecho, o ya lo estaba al cargar la página). Es idempotente
  // en el backend — si no había carrito anónimo (cookie), no cambia nada.
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      // Al cerrar sesión, un siguiente login (misma pestaña, sin recargar)
      // debe poder fusionar de nuevo si el usuario vuelve a armar un
      // carrito anónimo mientras tanto.
      mergedForSession.current = false;
      return;
    }
    if (sessionStatus !== "authenticated" || mergedForSession.current) return;
    mergedForSession.current = true;
    mergeCart()
      .then(({ cart: merged }) => setCart(merged))
      .catch(() => undefined);
  }, [sessionStatus]);

  const addItem = useCallback(async (variantId: string, cantidad = 1) => {
    const { cart: updated, limitado } = await addCartItem(variantId, cantidad);
    setCart(updated);
    setDrawerOpen(true);
    return { limitado };
  }, []);

  const updateQuantity = useCallback(async (itemId: string, cantidad: number) => {
    const { cart: updated } = await updateCartItem(itemId, cantidad);
    setCart(updated);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const { cart: updated } = await removeCartItem(itemId);
    setCart(updated);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        status,
        isDrawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de <CartProvider>.");
  return context;
}
