-- Módulo 02: columna de texto de búsqueda sin acentos, mantenida en aplicación
-- (importador por ahora) para que "sarten" encuentre "sartén" sin depender de
-- la extensión unaccent de PostgreSQL.
ALTER TABLE "products" ADD COLUMN "busqueda" TEXT NOT NULL DEFAULT '';

CREATE INDEX "products_busqueda_idx" ON "products"("busqueda");
