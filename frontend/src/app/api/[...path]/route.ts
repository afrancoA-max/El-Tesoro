import { NextRequest } from "next/server";

// Proxy explícito hacia el backend (Módulo 04). No usamos `rewrites()` de
// next.config.ts a propósito: su mecanismo interno para destinos externos
// (basado en http-proxy) tiene un timeout fijo de ~30s y problemas
// conocidos reenviando POST/cookies en salida `standalone` — terminaba en
// "socket hang up" al hacer login. Este handler usa fetch directo, bajo
// nuestro control, y reenvía cada header `Set-Cookie` individualmente
// (Headers.get colapsa cookies múltiples en una sola cadena inválida).
const BACKEND_ORIGIN = process.env.API_PROXY_TARGET ?? "http://localhost:8080";
// SEG-02: secreto compartido con el backend (ver
// backend/src/middlewares/rateLimit.middleware.ts) para que el límite de
// intentos de login se aplique por cliente real y no por este proxy.
const INTERNAL_PROXY_SECRET = process.env.INTERNAL_PROXY_SECRET ?? "";

export const dynamic = "force-dynamic";

/// La IP del navegador llega en el `X-Forwarded-For` que pone el balanceador
/// de Google delante de Cloud Run — Next solo lee el primer valor, nunca
/// confía en uno que el propio cliente pudiera mandar (se sobreescribe, no
/// se agrega).
function resolveClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || null;
}

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const url = new URL(`${BACKEND_ORIGIN}/api/${path.join("/")}${request.nextUrl.search}`);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("x-internal-client-ip");
  headers.delete("x-internal-proxy-secret");

  if (INTERNAL_PROXY_SECRET) {
    const clientIp = resolveClientIp(request);
    if (clientIp) {
      headers.set("x-internal-client-ip", clientIp);
      headers.set("x-internal-proxy-secret", INTERNAL_PROXY_SECRET);
    }
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch {
    return Response.json(
      { success: false, error: { code: "BACKEND_UNREACHABLE", message: "No se pudo conectar con el servidor." } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(backendResponse.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("set-cookie");

  const response = new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });

  for (const cookie of backendResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
