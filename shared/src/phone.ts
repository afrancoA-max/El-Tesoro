// Teléfonos de Guatemala (UX-01): el placeholder y los mensajes de error
// siempre mostraron el formato con guion ("5512-3456"), pero la validación
// solo aceptaba 8 dígitos seguidos — quien escribía el teléfono tal como se
// le pedía recibía un error. Este normalizador quita espacios, guiones y el
// prefijo "+502" antes de validar, y el resultado normalizado (8 dígitos) es
// lo que se guarda.
const PHONE_DIGITS_REGEX = /^\d{8}$/;

/** Quita espacios, guiones y el prefijo "+502" de un teléfono guatemalteco. */
export function normalizeTelefonoGt(value: string): string {
  const cleaned = value.trim().replace(/[\s-]/g, "");
  return cleaned.startsWith("+502") ? cleaned.slice(4) : cleaned;
}

/** true si, tras normalizar, el teléfono son 8 dígitos válidos. */
export function isTelefonoGtValido(value: string): boolean {
  return PHONE_DIGITS_REGEX.test(normalizeTelefonoGt(value));
}
