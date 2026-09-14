import { NextRequest } from "next/server";

// TEMPORAL — NUEVO-04: comprobación en staging de qué llega realmente en
// X-Forwarded-For detrás del balanceador de Google delante de Cloud Run,
// antes de tocar `resolveClientIp` en app/api/[...path]/route.ts. Se borra
// en cuanto se tenga el resultado (ver docs/revision/revision-14-sep-pre-modulo-06.md,
// hallazgo NUEVO-04) — no es parte del proxy real ni debe quedar en main.
export const dynamic = "force-dynamic";
// Redeploy trigger: 2026-09-14T1.

export async function GET(request: NextRequest) {
  return Response.json({
    xForwardedFor: request.headers.get("x-forwarded-for"),
    xForwardedProto: request.headers.get("x-forwarded-proto"),
    allHeaders: Object.fromEntries(request.headers.entries()),
  });
}
