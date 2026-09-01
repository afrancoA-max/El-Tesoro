import { ApiEnvelope } from "@/lib/api-types";
import { ApiError } from "./api";

// Mismo patrón que accountApi.ts: requiere sesión con cookies, un 401 aquí sí
// significa "sesión expirada" (el personal siempre está autenticado), por lo
// que reintenta una vez con /auth/refresh antes de rendirse.
const API_BASE_URL = "/api";

type Envelope<T> = ApiEnvelope<T> & { error?: { code: string; message: string } };

export interface StaffInventoryItem {
  variantId: string;
  sku: string;
  productoNombre: string;
  productoSlug: string;
  marca: string | null;
  categoria: string;
  atributos: string;
  imagen: string | null;
  precio: number;
  cantidadDisponible: number;
  cantidadReservada: number;
  umbralStockBajo: number;
}

export interface StaffInventoryResult {
  items: StaffInventoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

async function doFetch<T>(path: string, init?: RequestInit): Promise<{ response: Response; body: Envelope<T> | undefined }> {
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
  return { response, body };
}

function toResult<T>(response: Response, body: Envelope<T> | undefined): T {
  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? `Error del servidor (${response.status}).`, response.status);
  }
  return body.data;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const first = await doFetch<T>(path, init);

  if (first.response.status === 401) {
    const refresh = await doFetch("/auth/refresh", { method: "POST" }).catch(() => undefined);
    if (refresh?.response.ok) {
      const retried = await doFetch<T>(path, init);
      return toResult(retried.response, retried.body);
    }
  }

  return toResult(first.response, first.body);
}

export function searchStaffInventory(q: string) {
  return request<StaffInventoryResult>(`/staff/inventory?q=${encodeURIComponent(q)}&limit=30`);
}

export function fetchStaffInventoryByCategory(slug: string) {
  return request<StaffInventoryResult>(`/staff/inventory/by-category/${encodeURIComponent(slug)}?limit=100`);
}
