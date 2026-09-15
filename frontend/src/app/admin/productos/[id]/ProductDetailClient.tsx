"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminCategoryView, AdminProductView, ProductStatus } from "@el-tesoro/shared";
import { Badge, Button, Input, Select, Skeleton, Textarea, Toast } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import { useAdminPermissions } from "../../AdminShell";
import shared from "../../shared.module.css";

const ESTADO_LABEL: Record<ProductStatus, string> = { activo: "Publicado", borrador: "Borrador", descontinuado: "Desactivado" };
const ESTADO_BADGE: Record<ProductStatus, "success" | "neutral" | "danger"> = { activo: "success", borrador: "neutral", descontinuado: "danger" };

function VariantForm({ productId, onAdded }: { productId: string; onAdded: () => void }) {
  const [sku, setSku] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createVariant(productId, { sku, precio, cantidadDisponible: Number(cantidad) || 0 });
      setSku("");
      setPrecio("");
      setCantidad("0");
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la variante.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={shared.formRow} style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
      <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
      <Input label="Precio (Q)" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="199.99" required />
      <Input label="Stock inicial" type="number" min={0} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
      <Button type="submit" disabled={saving}>
        {saving ? "Agregando…" : "Agregar variante"}
      </Button>
      {error && <Toast variant="error" message={error} />}
    </form>
  );
}

export function ProductDetailClient({ id }: { id: string }) {
  const permissions = useAdminPermissions();
  const canWrite = permissions.includes("catalog:write");
  const [product, setProduct] = useState<AdminProductView | null>(null);
  const [categories, setCategories] = useState<AdminCategoryView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [descripcionCorta, setDescripcionCorta] = useState("");
  const [descripcionLarga, setDescripcionLarga] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminApi
      .getProduct(id)
      .then((p) => {
        setProduct(p);
        setNombre(p.nombre);
        setMarca(p.marca ?? "");
        setDescripcionCorta(p.descripcionCorta ?? "");
        setDescripcionLarga(p.descripcionLarga ?? "");
        setCategoriaId(p.categoriaId);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el producto."));
  }, [id]);

  useEffect(() => {
    adminApi.listCategories().then(setCategories).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateProduct(id, {
        nombre,
        marca: marca || null,
        descripcionCorta: descripcionCorta || null,
        descripcionLarga: descripcionLarga || null,
        categoriaId,
      });
      setMessage("Cambios guardados.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEstado(estado: ProductStatus) {
    setError(null);
    try {
      await adminApi.setProductEstado(id, estado);
      setMessage(estado === "activo" ? "Producto publicado." : "Producto desactivado.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado.");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await adminApi.addProductImage(id, file);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(imageId: string) {
    try {
      await adminApi.deleteProductImage(imageId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la imagen.");
    }
  }

  if (error && !product) return <Toast variant="error" message={error} />;
  if (!product) return <Skeleton style={{ height: 300 }} />;

  return (
    <div>
      <Link href="/admin/productos" className={shared.backLink}>
        ← Volver al catálogo
      </Link>
      <div className={shared.header}>
        <h1 className={shared.title}>{product.nombre}</h1>
        <Badge variant={ESTADO_BADGE[product.estado]}>{ESTADO_LABEL[product.estado]}</Badge>
      </div>

      {message && <Toast variant="success" message={message} />}
      {error && <Toast variant="error" message={error} />}

      {canWrite && (
        <div className={shared.actions} style={{ marginBottom: "1.5rem" }}>
          {product.estado !== "activo" && (
            <Button onClick={() => handleEstado("activo")} disabled={product.variants.length === 0} title={product.variants.length === 0 ? "Agrega al menos una variante con precio antes de publicar" : undefined}>
              Publicar
            </Button>
          )}
          {product.estado !== "descontinuado" && (
            <Button variant="danger" onClick={() => handleEstado("descontinuado")}>
              Desactivar
            </Button>
          )}
          {product.estado === "descontinuado" && <Button onClick={() => handleEstado("activo")}>Reactivar</Button>}
        </div>
      )}

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Datos generales</h2>
        <form className={shared.form} onSubmit={handleSave}>
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!canWrite} required />
          <Input label="Marca" value={marca} onChange={(e) => setMarca(e.target.value)} disabled={!canWrite} />
          <Select label="Categoría" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} disabled={!canWrite} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Input label="Descripción corta" value={descripcionCorta} onChange={(e) => setDescripcionCorta(e.target.value)} disabled={!canWrite} />
          <Textarea label="Descripción larga" rows={4} value={descripcionLarga} onChange={(e) => setDescripcionLarga(e.target.value)} disabled={!canWrite} />
          {canWrite && (
            <div className={shared.actions}>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          )}
        </form>
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Variantes ({product.variants.length})</h2>
        {product.variants.length > 0 && (
          <div className={shared.tableWrap} style={{ marginBottom: "1rem" }}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Precio</th>
                  <th>Disponible</th>
                  <th>Reservado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v) => (
                  <tr key={v.id}>
                    <td>{v.sku}</td>
                    <td>{formatCurrency(v.precio)}</td>
                    <td>{v.cantidadDisponible}</td>
                    <td>{v.cantidadReservada}</td>
                    <td>
                      <Badge variant={v.activo ? "success" : "neutral"}>{v.activo ? "Activa" : "Inactiva"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canWrite && <VariantForm productId={id} onAdded={load} />}
      </div>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Fotos</h2>
        <div className={shared.imageGrid} style={{ marginBottom: "1rem" }}>
          {product.images.map((img) => (
            <div key={img.id} className={shared.imageThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.textoAlternativo ?? ""} />
              {canWrite && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteImage(img.id)}
                  style={{ position: "absolute", top: 2, right: 2, padding: "2px 6px" }}
                >
                  ×
                </Button>
              )}
            </div>
          ))}
        </div>
        {canWrite && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            {uploading && <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Subiendo…</p>}
          </>
        )}
      </div>
    </div>
  );
}
