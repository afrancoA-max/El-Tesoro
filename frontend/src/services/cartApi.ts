import { Cart } from "@el-tesoro/shared";
import { apiRequest } from "./httpClient";

// Servicio de dominio para el carrito. El cliente HTTP en sí vive en
// httpClient.ts, compartido con accountApi.ts.
//
// CAR-01: el carrito es anónimo por diseño y un 401 aquí seguía sin
// significar "sesión expirada" — pero cuando SÍ había sesión y el access
// token expiró a medio camino, el backend (`optionalAuth`) degradaba la
// petición a invitado en silencio (200, carrito vacío) en vez de fallar.
// httpClient.ts detecta esa degradación por el header `X-Access-Token-
// Expired` y reintenta tras refrescar, así que estas funciones ya no
// necesitan su propia lógica de reintento.
const request = apiRequest;

export function fetchCart() {
  return request<Cart>("/cart");
}

export function addCartItem(variantId: string, cantidad = 1) {
  return request<{ cart: Cart; limitado: boolean }>("/cart/items", {
    method: "POST",
    body: JSON.stringify({ variantId, cantidad }),
  });
}

export function updateCartItem(itemId: string, cantidad: number) {
  return request<{ cart: Cart }>(`/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ cantidad }),
  });
}

export function removeCartItem(itemId: string) {
  return request<{ cart: Cart }>(`/cart/items/${itemId}`, { method: "DELETE" });
}

// Se llama justo después de un login exitoso (ver UserContext) — fusiona el
// carrito anónimo (si existe, vía cookie httpOnly) con el de la cuenta.
// Idempotente: si no había carrito anónimo, simplemente devuelve el de la
// cuenta sin cambiar nada.
export function mergeCart() {
  return request<{ cart: Cart }>("/cart/merge", { method: "POST" });
}
