"use client";

import { useMemo, useState } from "react";
import { ProductDetail, ProductVariant } from "@/lib/api-types";
import { formatCurrency } from "@/lib/format";
import { Badge, Button, FavoriteButton, QuantityStepper, Toast } from "@/components/ui";
import { useCart } from "@/context/CartContext";
import { ApiError } from "@/services/api";
import { ProductGallery } from "./ProductGallery";
import styles from "./ProductViewer.module.css";

export interface ProductViewerProps {
  product: ProductDetail;
}

function buildAttributeOptions(variants: ProductVariant[]): Map<string, string[]> {
  const options = new Map<string, string[]>();
  for (const variant of variants) {
    for (const attr of variant.atributos) {
      const values = options.get(attr.tipo) ?? [];
      if (!values.includes(attr.valor)) values.push(attr.valor);
      options.set(attr.tipo, values);
    }
  }
  return options;
}

function findMatchingVariant(variants: ProductVariant[], selection: Record<string, string>): ProductVariant | undefined {
  return variants.find((variant) =>
    variant.atributos.every((attr) => selection[attr.tipo] === attr.valor) &&
    Object.keys(selection).length === variant.atributos.length,
  );
}

// CAR-04: antes de esto, elegir una combinación de atributos inexistente
// (p. ej. Color X + Tamaño Y cuando esa variante no existe) caía en
// `?? firstVariant` — la ficha mostraba precio y stock de OTRA variante y
// "Agregar al carrito" la metía al carrito sin que el cliente lo notara.
// Una opción se marca como no disponible si ninguna variante la combina con
// lo que ya está elegido en los demás atributos.
function isOptionAvailable(variants: ProductVariant[], selection: Record<string, string>, tipo: string, valor: string): boolean {
  return variants.some(
    (variant) =>
      variant.atributos.some((attr) => attr.tipo === tipo && attr.valor === valor) &&
      Object.entries(selection).every(
        ([selTipo, selValor]) => selTipo === tipo || variant.atributos.some((attr) => attr.tipo === selTipo && attr.valor === selValor),
      ),
  );
}

// Al cambiar un atributo, si la combinación resultante no existe, se ajustan
// los demás atributos a la primera variante que sí combine con el valor
// recién elegido, en vez de dejar al cliente en un estado sin variante.
function resolveSelection(
  variants: ProductVariant[],
  previous: Record<string, string>,
  tipo: string,
  valor: string,
): Record<string, string> {
  const next = { ...previous, [tipo]: valor };
  if (findMatchingVariant(variants, next)) return next;

  const fallback = variants.find((variant) => variant.atributos.some((attr) => attr.tipo === tipo && attr.valor === valor));
  if (!fallback) return next;
  return Object.fromEntries(fallback.atributos.map((attr) => [attr.tipo, attr.valor]));
}

export function ProductViewer({ product }: ProductViewerProps) {
  const attributeOptions = useMemo(() => buildAttributeOptions(product.variantes), [product.variantes]);
  const hasVariantAttributes = attributeOptions.size > 0;

  const firstVariant = product.variantes[0];
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    if (!firstVariant) return {};
    return Object.fromEntries(firstVariant.atributos.map((attr) => [attr.tipo, attr.valor]));
  });

  // CAR-04: sin fallback silencioso a `firstVariant` — si la combinación
  // elegida no existe, `activeVariant` queda `undefined` y la interfaz lo
  // muestra explícitamente en vez de vender otra variante por error.
  const activeVariant = hasVariantAttributes ? findMatchingVariant(product.variantes, selection) : firstVariant;

  const galleryImages = activeVariant?.imagenes.length ? activeVariant.imagenes : product.imagenes;
  const disponible = activeVariant?.disponible ?? false;
  const precio = activeVariant?.precio ?? "0";
  const precioComparativo = activeVariant?.precioComparativo ?? null;
  const stockDisponible = activeVariant?.stockDisponible ?? 0;
  // CAR-03: tope de cantidad en la ficha — el stock real de la variante o
  // el tope general de 99 por línea, lo que sea menor.
  const maxCantidad = Math.max(1, Math.min(stockDisponible, 99));

  const { addItem } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addNotice, setAddNotice] = useState<string | null>(null);

  // Si cambia la variante activa (otra combinación de atributos), la
  // cantidad elegida vuelve a 1 en vez de arrastrar un número que podía
  // superar el stock de la variante anterior. Ajuste de estado durante el
  // render (no en un efecto): React re-renderiza antes de pintar, así que
  // no hay parpadeo, y evita el "cascading render" de un setState en efecto.
  const [lastVariantId, setLastVariantId] = useState(activeVariant?.id);
  if (activeVariant?.id !== lastVariantId) {
    setLastVariantId(activeVariant?.id);
    setCantidad(1);
    setAddNotice(null);
  }

  const handleSelectAttribute = (tipo: string, valor: string) => {
    setSelection((prev) => resolveSelection(product.variantes, prev, tipo, valor));
  };

  const handleAddToCart = async () => {
    if (!activeVariant || adding) return;
    setAdding(true);
    setAddError(null);
    setAddNotice(null);
    try {
      const { limitado } = await addItem(activeVariant.id, cantidad);
      if (limitado) {
        setAddNotice(`Solo hay ${stockDisponible} disponibles; agregamos ${Math.min(cantidad, stockDisponible)}.`);
      }
    } catch (error) {
      setAddError(error instanceof ApiError ? error.message : "No se pudo agregar al carrito.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <ProductGallery images={galleryImages} productName={product.nombre} />

      <div className={styles.info}>
        {product.marca && <p className={styles.brand}>{product.marca}</p>}
        <h1 className={styles.name}>{product.nombre}</h1>

        <div className={styles.priceRow}>
          <span className={styles.price}>{formatCurrency(precio)}</span>
          {precioComparativo && Number(precioComparativo) > Number(precio) && (
            <span className={styles.priceCompare}>{formatCurrency(precioComparativo)}</span>
          )}
          <Badge variant={disponible ? "success" : "danger"}>{disponible ? "Disponible" : "Agotado"}</Badge>
        </div>

        {product.descripcionCorta && <p className={styles.description}>{product.descripcionCorta}</p>}

        {hasVariantAttributes && (
          <div className={styles.variantGroups}>
            {Array.from(attributeOptions.entries()).map(([tipo, valores]) => (
              <fieldset key={tipo} className={styles.variantGroup}>
                <legend className={styles.variantLabel}>{tipo}</legend>
                <div className={styles.variantOptions}>
                  {valores.map((valor) => {
                    const isSelected = selection[tipo] === valor;
                    const disponibleCombinacion = isOptionAvailable(product.variantes, selection, tipo, valor);
                    return (
                      <button
                        key={valor}
                        type="button"
                        className={[
                          styles.variantOption,
                          isSelected ? styles.variantOptionActive : "",
                          !disponibleCombinacion ? styles.variantOptionUnavailable : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-pressed={isSelected}
                        disabled={!disponibleCombinacion}
                        title={!disponibleCombinacion ? "No combina con lo ya elegido" : undefined}
                        onClick={() => handleSelectAttribute(tipo, valor)}
                      >
                        {valor}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {activeVariant && disponible && (
          <div className={styles.quantityRow}>
            <span className={styles.quantityLabel}>Cantidad</span>
            <QuantityStepper
              value={cantidad}
              max={maxCantidad}
              onChange={setCantidad}
              label={`Cantidad de ${product.nombre}`}
            />
          </div>
        )}

        <div className={styles.ctaRow}>
          <Button
            variant="primary"
            size="md"
            disabled={!activeVariant || !disponible || adding}
            onClick={handleAddToCart}
          >
            {adding ? "Agregando…" : !activeVariant ? "Combinación no disponible" : "Agregar al carrito"}
          </Button>
          <FavoriteButton
            size="md"
            item={{
              slug: product.slug,
              nombre: product.nombre,
              marca: product.marca,
              precioDesde: precio,
              imagenPrincipal: product.imagenes[0]?.url ?? null,
            }}
          />
        </div>
        {addError && (
          <div className={styles.ctaFeedback}>
            <Toast variant="error" message={addError} />
          </div>
        )}
        {addNotice && (
          <div className={styles.ctaFeedback}>
            <Toast variant="info" message={addNotice} />
          </div>
        )}

        {product.especificaciones && Object.keys(product.especificaciones).length > 0 && (
          <div className={styles.specsBlock}>
            <h2 className={styles.sectionTitle}>Características</h2>
            {/* Tabla 100% dinámica: las filas salen de las claves que traiga
                `especificaciones` para este producto puntual — un producto
                puede tener 3 características y otro 10, sin lista fija en
                el código (ver retail-catalog-data-model / Módulo 02). */}
            <table className={styles.specs}>
              <tbody>
                {Object.entries(product.especificaciones).map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {product.descripcionLarga && (
          <div className={styles.longDescription}>
            <h2 className={styles.sectionTitle}>Descripción</h2>
            <p>{product.descripcionLarga}</p>
          </div>
        )}
      </div>
    </div>
  );
}
