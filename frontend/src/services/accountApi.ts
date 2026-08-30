import { PublicUser, Address } from "@el-tesoro/shared";
import { ApiEnvelope } from "@/lib/api-types";
import { ApiError } from "./api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

type Envelope<T> = ApiEnvelope<T> & { error?: { code: string; message: string } };

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
  if (response.status === 204) return { response, body: undefined };
  const body = (await response.json().catch(() => undefined)) as Envelope<T> | undefined;
  return { response, body };
}

function toResult<T>(response: Response, body: Envelope<T> | undefined): T {
  if (response.status === 204) return undefined as T;
  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? `Error del servidor (${response.status}).`, response.status);
  }
  return body.data;
}

// Rutas cuyo 401 significa "credenciales inválidas", no "sesión expirada" —
// reintentar tras un refresh no tiene sentido ahí y podría enmascarar el
// error real.
const NO_REFRESH_RETRY = ["/auth/login", "/auth/refresh", "/auth/register"];

/// Cliente de mutaciones para cuentas/autenticación. Distinto de `apiGet`
/// (lectura de catálogo, cacheado por Next): estas llamadas siempre van
/// con `credentials: "include"` (cookies httpOnly de sesión) y nunca se
/// cachean — cada una refleja el estado de sesión en ese instante.
///
/// El access token dura poco (15 min) a propósito. Si expiró a mitad de
/// una sesión larga (ej. usuario llenando el formulario de dirección), un
/// 401 aquí dispara un refresh silencioso vía la cookie de refresh y
/// reintenta la petición una sola vez antes de rendirse.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const first = await doFetch<T>(path, init);

  if (first.response.status === 401 && !NO_REFRESH_RETRY.some((p) => path.startsWith(p))) {
    const refresh = await doFetch("/auth/refresh", { method: "POST" }).catch(() => undefined);
    if (refresh?.response.ok) {
      const retried = await doFetch<T>(path, init);
      return toResult(retried.response, retried.body);
    }
  }

  return toResult(first.response, first.body);
}

// --- Sesión ---

export function registerAccount(input: { nombre: string; email: string; password: string }) {
  return request<{ user: PublicUser }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export function loginAccount(input: { email: string; password: string }) {
  return request<{ user: PublicUser }>("/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function logoutAccount() {
  return request<{ loggedOut: boolean }>("/auth/logout", { method: "POST" });
}

export function fetchCurrentUser() {
  return request<{ user: PublicUser }>("/auth/me");
}

export function verifyEmail(token: string) {
  return request<{ verified: boolean }>(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function resendVerification(email: string) {
  return request<{ sent: boolean }>("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
}

export function requestPasswordReset(email: string) {
  return request<{ sent: boolean }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetPassword(input: { token: string; password: string }) {
  return request<{ reset: boolean }>("/auth/reset-password", { method: "POST", body: JSON.stringify(input) });
}

// --- Perfil ---

export function updateProfile(input: { nombre?: string; telefono?: string; nit?: string }) {
  return request<{ user: PublicUser }>("/account/profile", { method: "PATCH", body: JSON.stringify(input) });
}

// --- Direcciones ---

export interface AddressInput {
  alias?: string;
  nombreDestinatario: string;
  telefono: string;
  departamento: string;
  municipio: string;
  direccion: string;
  referencia?: string;
  esPredeterminada?: boolean;
}

export function listAddresses() {
  return request<{ items: Address[] }>("/account/addresses");
}

export function createAddress(input: AddressInput) {
  return request<{ address: Address }>("/account/addresses", { method: "POST", body: JSON.stringify(input) });
}

export function updateAddress(id: string, input: AddressInput) {
  return request<{ address: Address }>(`/account/addresses/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function setDefaultAddress(id: string) {
  return request<{ address: Address }>(`/account/addresses/${id}/default`, { method: "PATCH" });
}

export function deleteAddress(id: string) {
  return request<void>(`/account/addresses/${id}`, { method: "DELETE" });
}

// --- Pedidos (Módulo 04: solo estructura; contenido real desde el Módulo 06) ---

export function listMyOrders() {
  return request<{ items: unknown[]; total: number }>("/account/orders");
}
