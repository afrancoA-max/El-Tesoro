"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Cart } from "@el-tesoro/shared";
import { fetchCart, addCartItem, updateCartItem, acknowledgePriceChange, removeCartItem, mergeCart } from "@/services/cartApi";
import { useUser } from "@/context/UserContext";
import { createTabChannel } from "@/lib/tabSync";

const EMPTY_CART: Cart = { id: null, items: [], subtotal: "0.00", totalUnidades: 0 };

// CAR-02: el contador del carrito no se actualizaba en otras pestañas tras
// agregar/quitar en una de ellas. Cada mutación exitosa (incluida la fusión
// al iniciar sesión) transmite el carrito resultante; las demás pestañas lo
// aplican directamente porque ya viene calculado por el servidor — no hay
// nada que recalcular ni riesgo de aplicar un total optimista incorrecto.
const cartChannel = createTabChannel<Cart>("eltesoro-cart");

interface CartContextValue {
  cart: Cart;
  status: "loading" | "ready" | "error";
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (variantId: string, cantidad?: number) => Promise<{ limitado: boolean }>;
  updateQuantity: (itemId: string, cantidad: number) => Promise<{ limitado: boolean }>;
  acknowledgePriceChange: (itemId: string) => Promise<void>;
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

  // CAR-09(d): la carga inicial (`fetchCart` al montar) y la fusión al
  // iniciar sesión (`mergeCart`) pueden resolver en cualquier orden. Si la
  // carga inicial termina después de la fusión, no debe sobrescribir el
  // carrito ya fusionado con uno más viejo. Cada llamada que va a aplicar un
  // carrito se numera; solo se aplica si nadie emitió una llamada más nueva
  // mientras tanto (comparar contra `requestSeq.current`, que solo avanza al
  // *iniciar* una llamada, resuelve "la última en pedirse gana" sin
  // importar en qué orden respondan).
  const requestSeq = useRef(0);
  const applyCart = useCallback((seq: number, next: Cart) => {
    if (seq === requestSeq.current) setCart(next);
  }, []);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      const current = await fetchCart();
      applyCart(seq, current);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [applyCart]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    fetchCart()
      .then((current) => {
        applyCart(seq, current);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [applyCart]);

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
      // CAR-08: el carrito de la cuenta no se limpiaba al cerrar sesión — el
      // header/drawer seguían mostrando sus productos hasta recargar. Volver
      // a pedir el carrito aquí lo deja como el del invitado (vacío, o el
      // carrito anónimo que hubiera quedado por la cookie `eltesoro_cart`).
      const seq = ++requestSeq.current;
      fetchCart()
        .then((current) => {
          applyCart(seq, current);
          cartChannel.post(current);
        })
        .catch(() => undefined);
      return;
    }
    if (sessionStatus !== "authenticated" || mergedForSession.current) return;
    mergedForSession.current = true;
    const seq = ++requestSeq.current;
    mergeCart()
      .then(({ cart: merged }) => {
        applyCart(seq, merged);
        cartChannel.post(merged);
      })
      .catch(() => undefined);
  }, [sessionStatus, applyCart]);

  // CAR-02: sin esto, agregar/quitar en una pestaña no se reflejaba en las
  // demás hasta recargar. Al recibir el carrito de otra pestaña se aplica
  // directamente (ya viene calculado por el servidor) y se marca como la
  // versión más reciente para no perderlo si una petición propia, más
  // vieja, resuelve después.
  useEffect(
    () =>
      cartChannel.subscribe((incoming) => {
        requestSeq.current += 1;
        setCart(incoming);
        setStatus("ready");
      }),
    [],
  );

  // Respaldo por si se perdió el mensaje del canal (ej. la pestaña estaba
  // dormida): al volver a primer plano, se refresca desde el servidor.
  useEffect(() => {
    function onFocus() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const addItem = useCallback(
    async (variantId: string, cantidad = 1) => {
      const seq = ++requestSeq.current;
      const { cart: updated, limitado } = await addCartItem(variantId, cantidad);
      applyCart(seq, updated);
      cartChannel.post(updated);
      setDrawerOpen(true);
      return { limitado };
    },
    [applyCart],
  );

  const updateQuantity = useCallback(
    async (itemId: string, cantidad: number) => {
      const seq = ++requestSeq.current;
      const { cart: updated, limitado } = await updateCartItem(itemId, cantidad);
      applyCart(seq, updated);
      cartChannel.post(updated);
      return { limitado };
    },
    [applyCart],
  );

  const acknowledgePriceChangeCallback = useCallback(
    async (itemId: string) => {
      const seq = ++requestSeq.current;
      const { cart: updated } = await acknowledgePriceChange(itemId);
      applyCart(seq, updated);
      cartChannel.post(updated);
    },
    [applyCart],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const seq = ++requestSeq.current;
      const { cart: updated } = await removeCartItem(itemId);
      applyCart(seq, updated);
      cartChannel.post(updated);
    },
    [applyCart],
  );

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
        acknowledgePriceChange: acknowledgePriceChangeCallback,
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
