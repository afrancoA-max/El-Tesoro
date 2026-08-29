"use client";

import { useMemo, useState } from "react";
import { ProductDetail, ProductVariant } from "@/lib/api-types";
import { formatCurrency } from "@/lib/format";
import { Badge, Button } from "@/components/ui";
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

export function ProductViewer({ product }: ProductViewerProps) {
  const attributeOptions = useMemo(() => buildAttributeOptions(product.variantes), [product.variantes]);
  const hasVariantAttributes = attributeOptions.size > 0;

  const firstVariant = product.variantes[0];
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    if (!firstVariant) return {};
    return Object.fromEntries(firstVariant.atributos.map((attr) => [attr.tipo, attr.valor]));
  });

  const activeVariant = hasVariantAttributes ? findMatchingVariant(product.variantes, selection) ?? firstVariant : firstVariant;

  const galleryImages = activeVariant?.imagenes.length ? activeVariant.imagenes : product.imagenes;
  const disponible = activeVariant?.disponible ?? false;
  const precio = activeVariant?.precio ?? "0";
  const precioComparativo = activeVariant?.precioComparativo ?? null;

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
                    return (
                      <button
                        key={valor}
                        type="button"
                        className={[styles.variantOption, isSelected ? styles.variantOptionActive : ""]
                          .filter(Boolean)
                          .join(" ")}
                        aria-pressed={isSelected}
                        onClick={() => setSelection((prev) => ({ ...prev, [tipo]: valor }))}
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

        <div className={styles.ctaRow}>
          <Button variant="primary" size="md" disabled title="Disponible próximamente — el carrito llega en el Módulo 05">
            Agregar al carrito
          </Button>
          <span className={styles.ctaNote}>Próximamente</span>
        </div>

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
