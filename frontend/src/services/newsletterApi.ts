import { ApiError } from "./api";

export interface NewsletterSubscribeInput {
  nombre: string;
  apellido: string;
  email: string;
}

export async function subscribeToNewsletter(input: NewsletterSubscribeInput): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  }

  const body = await response.json().catch(() => undefined);
  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? `Error del servidor (${response.status}).`, response.status);
  }
}
