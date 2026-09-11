import { ApiEnvelope } from "@/lib/api-types";
import { ApiError } from "./api";

// Cliente HTTP unificado para todas las mutaciones autenticadas del sitio
// (cuenta y carrito — CAR-01). Antes `accountApi.ts` reintentaba tras un
// refresh y `cartApi.ts` no, porque el carrito es anónimo por diseño y un
// 401 ahí "no significa nada". Pero el carrito SÍ necesita reintentar
// cuando había sesión y el access token expiró a medio camino: sin refresh,
// `optionalAuth` lo trata como invitado y el cliente ve su carrito
// "vaciarse" hasta que recarga la página.
//
// La señal para eso no es un 401 (el carrito igual responde 200 como
// invitado) sino el header `X-Access-Token-Expired` que pone
// `optionalAuth.middleware.ts` cuando el JWT venía pero ya expiró.
const API_BASE_URL = "/api";
const TOKEN_EXPIRED_HEADER = "x-access-token-expired";

type Envelope<T> = ApiEnvelope<T> & { error?: { code: string; message: string } };

// Rutas cuyo 401 significa "credenciales inválidas", no "sesión expirada" —
// reintentar tras un refresh no tiene sentido ahí y podría enmascarar el
// error real.
const NO_REFRESH_RETRY = ["/auth/login", "/auth/refresh", "/auth/register"];

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

/// El access token dura poco (15 min) a propósito. Si expiró a mitad de una
/// sesión larga, dos cosas pueden pasar según la ruta: una protegida con
/// `requireAuth` responde 401; una anónima por diseño (carrito) responde
/// 200 pero degradada a invitado y avisa con `TOKEN_EXPIRED_HEADER`. En
/// ambos casos se dispara un refresh silencioso vía la cookie de refresh y
/// se reintenta la petición original una sola vez antes de rendirse.
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const first = await doFetch<T>(path, init);
  const noRetry = NO_REFRESH_RETRY.some((p) => path.startsWith(p));
  const shouldRetry = !noRetry && (first.response.status === 401 || first.response.headers.get(TOKEN_EXPIRED_HEADER) === "1");

  if (shouldRetry) {
    const refresh = await doFetch("/auth/refresh", { method: "POST" }).catch(() => undefined);
    if (refresh?.response.ok) {
      const retried = await doFetch<T>(path, init);
      return toResult(retried.response, retried.body);
    }
  }

  return toResult(first.response, first.body);
}
