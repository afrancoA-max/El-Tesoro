import { ApiEnvelope } from "@/lib/api-types";

// URL pública de la API en staging (Módulo 02). Se usa tanto en servidor
// (SSR/generateMetadata) como en cliente (autocompletado de búsqueda) —
// CORS en staging está abierto (`CORS_ORIGINS=*`), así que NEXT_PUBLIC_
// es seguro aquí; restringir cuando exista dominio de producción.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string, searchParams?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });
  } catch {
    throw new ApiError("No se pudo conectar con el catálogo. Revisa tu conexión.", 0);
  }

  if (!response.ok) {
    throw new ApiError(`La API respondió con un error (${response.status}).`, response.status);
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  if (!body.success) {
    throw new ApiError("La API reportó una respuesta inválida.", response.status);
  }
  return body.data;
}
