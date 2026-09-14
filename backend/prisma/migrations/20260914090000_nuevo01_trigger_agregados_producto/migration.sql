-- NUEVO-01: products.precioDesde/disponible eran mantenidas SOLO por
-- import-catalog.ts y el backfill (backend/scripts/backfill-precio-disponible.ts).
-- En cuanto algo más cambie precio/stock/estado de una variante — el
-- checkout del Módulo 06 reservando stock, el panel admin del Módulo 08
-- editando precios — esas columnas quedan desalineadas hasta la próxima
-- importación, y el filtro "solo disponibles" (CAT-02) empieza a mentir.
--
-- Se implementa como trigger de Postgres (la alternativa "más robusta" que
-- señala la revisión) en vez de una función que cada caller deba recordar
-- llamar: así ningún código futuro (Módulo 06, Módulo 08, o cualquier ajuste
-- manual de inventario) puede olvidarse de mantener el agregado.
--
-- NUEVO-02: el "stock vendible" que decide `disponible` es
-- cantidadDisponible - cantidadReservada (nunca cantidadDisponible sola) —
-- mismo criterio que shared/src/inventory.ts (`stockVendible`), para que la
-- reserva de stock del Módulo 06 se refleje aquí sin tocar este trigger.

CREATE OR REPLACE FUNCTION refresh_product_aggregates(p_product_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE products p
  SET "precioDesde" = sub.min_precio,
      disponible = sub.disponible
  FROM (
    SELECT
      pv."productId" AS product_id,
      MIN(pv.precio) AS min_precio,
      BOOL_OR((COALESCE(inv."cantidadDisponible", 0) - COALESCE(inv."cantidadReservada", 0)) > 0) AS disponible
    FROM product_variants pv
    LEFT JOIN inventory inv ON inv."variantId" = pv.id
    WHERE pv.activo = true AND pv."productId" = p_product_id
    GROUP BY pv."productId"
  ) sub
  WHERE p.id = sub.product_id;

  -- Si el producto se quedó sin variantes activas, la subconsulta de arriba
  -- no devuelve fila (nada que UPDATE-ear) — limpiar explícitamente en vez
  -- de dejar el último valor conocido, que ya no representa nada vendible.
  UPDATE products
  SET "precioDesde" = NULL, disponible = false
  WHERE id = p_product_id
    AND NOT EXISTS (
      SELECT 1 FROM product_variants WHERE "productId" = p_product_id AND activo = true
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_product_aggregates_from_variant()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_product_aggregates(OLD."productId");
    RETURN OLD;
  END IF;

  PERFORM refresh_product_aggregates(NEW."productId");
  IF TG_OP = 'UPDATE' AND OLD."productId" IS DISTINCT FROM NEW."productId" THEN
    PERFORM refresh_product_aggregates(OLD."productId");
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_variants_refresh_aggregates ON product_variants;
CREATE TRIGGER product_variants_refresh_aggregates
AFTER INSERT OR DELETE OR UPDATE OF precio, activo, "productId" ON product_variants
FOR EACH ROW EXECUTE FUNCTION trg_refresh_product_aggregates_from_variant();

CREATE OR REPLACE FUNCTION trg_refresh_product_aggregates_from_inventory()
RETURNS trigger AS $$
DECLARE
  v_product_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT "productId" INTO v_product_id FROM product_variants WHERE id = OLD."variantId";
  ELSE
    SELECT "productId" INTO v_product_id FROM product_variants WHERE id = NEW."variantId";
  END IF;

  IF v_product_id IS NOT NULL THEN
    PERFORM refresh_product_aggregates(v_product_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_refresh_aggregates ON inventory;
CREATE TRIGGER inventory_refresh_aggregates
AFTER INSERT OR DELETE OR UPDATE OF "cantidadDisponible", "cantidadReservada" ON inventory
FOR EACH ROW EXECUTE FUNCTION trg_refresh_product_aggregates_from_inventory();

-- Backfill único: cubre productos creados antes de que este trigger
-- existiera y cuyo precio/stock no cambie después (si ya corrieron
-- import-catalog.ts o el backfill anterior esto es un no-op).
SELECT refresh_product_aggregates(id) FROM products;
