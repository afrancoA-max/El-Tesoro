"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import styles from "./AddToCartButton.module.css";

export interface AddToCartButtonProps {
  variantId: string;
  nombre: string;
  disponible: boolean;
  className?: string;
}

// Quick-add desde la tarjeta de producto (docs/plan/05-carrito.md punto 2):
// solo existe cuando el producto tiene una única variante — ProductCard ya
// filtra eso vía `varianteUnica`, así que este botón nunca necesita
// preguntar Talla/Color.
export function AddToCartButton({ variantId, nombre, disponible, className }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [state, setState] = useState<"idle" | "adding" | "added" | "error">("idle");

  if (!disponible) return null;

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (state === "adding") return;
    setState("adding");
    try {
      await addItem(variantId, 1);
      setState("added");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(" ")}
      onClick={handleClick}
      disabled={state === "adding"}
      aria-label={`Agregar ${nombre} al carrito`}
      title="Agregar al carrito"
    >
      {state === "added" ? "Agregado ✓" : state === "error" ? "No se pudo agregar" : state === "adding" ? "Agregando…" : "Agregar al carrito"}
    </button>
  );
}
