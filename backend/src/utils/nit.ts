/// Valida el formato del NIT guatemalteco: acepta "CF" (Consumidor Final,
/// sin distinción de mayúsculas) o dígitos con dígito/letra verificadora
/// final (opcionalmente separada por guion), p.ej. "12345678-9" o "1234K".
/// No implementa el algoritmo de dígito verificador del SAT: hacerlo mal
/// rechazaría NITs reales de clientes, un costo mayor que aceptar formatos
/// bien formados sin verificar el checksum.
const NIT_PATTERN = /^\d{4,10}-?[0-9Kk]$/;

export function isNitValido(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === "CF") return true;
  return NIT_PATTERN.test(trimmed);
}

export function normalizeNit(value: string): string {
  const trimmed = value.trim();
  return trimmed.toUpperCase() === "CF" ? "CF" : trimmed.toUpperCase();
}
