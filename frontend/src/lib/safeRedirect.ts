// SEG-07: valida el destino de un parámetro `?next=` antes de navegar ahí.
// Solo se aceptan rutas relativas internas ("/algo"); se rechaza cualquier
// URL absoluta ("https://sitio-falso.com") y "//sitio-falso.com" (el
// navegador lo interpreta como protocol-relative a otro dominio, no como
// una ruta que empieza con "/").
export function safeRedirectPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
