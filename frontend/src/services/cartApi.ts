import { Cart } from "@el-tesoro/shared";
import { ApiEnvelope } from "@/lib/api-types";
import { ApiError } from "./api";

// Mismo patrón que accountApi.ts: mutaciones con cookies de sesión
// (`credentials: "include"`) y sin caché — el carrito nunca debe mostrar un
// estado obsoleto. El carrito es anónimo por diseño (Módulo 04), así que a
// diferencia de accountApi.ts un 401 aquí no significa "sesión expirada",
// solo "no hay sesión" — no tiene sentido reintentar con refresh.
const API_BASE_URL = "/api";

type Envelope<T> = ApiEnvelope<T> & { error?: { code: string; message: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }

  const body = (await response.json().catch(() => undefined)) as Envelope<T> | undefined;
  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? `Error del servidor (${response.status}).`, response.status);
  }
  return body.data;
}

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
