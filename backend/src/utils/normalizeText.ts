/// Quita acentos/diacríticos y pasa a minúsculas — usado tanto al escribir
/// `Product.busqueda` (importador) como al normalizar el término de búsqueda
/// entrante, para que "sarten" encuentre "sartén" sin extensión de Postgres.
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
