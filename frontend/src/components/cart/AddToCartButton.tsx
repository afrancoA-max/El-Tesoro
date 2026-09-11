"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { ApiError } from "@/services/api";
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
  // CAR-07: antes el botón mostraba "No se pudo agregar" sin decir por qué
  // (agotado, error de red, etc.) — ahora se guarda el motivo del backend
  // para mostrarlo, en vez de descartar el error en el `catch`.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!disponible) return null;

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (state === "adding") return;
    setState("adding");
    setErrorMessage(null);
    try {
      await addItem(variantId, 1);
      setState("added");
      setTimeout(() => setState("idle"), 1500);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "No se pudo agregar al carrito.");
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  };

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(" ")}
      onClick={handleClick}
      disabled={state === "adding"}
      aria-label={`Agregar ${nombre} al carrito`}
      title={state === "error" ? (errorMessage ?? "No se pudo agregar") : "Agregar al carrito"}
    >
      {state === "added" ? "Agregado ✓" : state === "error" ? errorMessage ?? "No se pudo agregar" : state === "adding" ? "Agregando…" : "Agregar al carrito"}
    </button>
  );
}
