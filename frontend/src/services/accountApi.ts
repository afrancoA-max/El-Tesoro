import { PublicUser, Address } from "@el-tesoro/shared";
import { apiRequest } from "./httpClient";

// Servicio de dominio para cuentas/autenticación. El cliente HTTP en sí
// (fetch con cookies, refresh+reintento — CAR-01) vive en httpClient.ts,
// compartido con cartApi.ts.
const request = apiRequest;

// --- Sesión ---

export function registerAccount(input: { nombre: string; email: string; password: string }) {
  return request<{ user: PublicUser; emailSent: boolean }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
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
