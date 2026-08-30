import { NextRequest } from "next/server";

// Proxy explícito hacia el backend (Módulo 04). No usamos `rewrites()` de
// next.config.ts a propósito: su mecanismo interno para destinos externos
// (basado en http-proxy) tiene un timeout fijo de ~30s y problemas
// conocidos reenviando POST/cookies en salida `standalone` — terminaba en
// "socket hang up" al hacer login. Este handler usa fetch directo, bajo
// nuestro control, y reenvía cada header `Set-Cookie` individualmente
// (Headers.get colapsa cookies múltiples en una sola cadena inválida).
const BACKEND_ORIGIN = process.env.API_PROXY_TARGET ?? "http://localhost:8080";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const url = new URL(`${BACKEND_ORIGIN}/api/${path.join("/")}${request.nextUrl.search}`);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

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
