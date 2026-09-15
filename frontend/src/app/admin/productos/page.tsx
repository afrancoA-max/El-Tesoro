"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminCategoryView, AdminProductSummaryView, ProductStatus } from "@el-tesoro/shared";
import { Badge, Button, Input, Modal, Select, Skeleton, Toast } from "@/components/ui";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import { useAdminPermissions } from "../AdminShell";
import shared from "../shared.module.css";

const ESTADO_LABEL: Record<ProductStatus, string> = { activo: "Publicado", borrador: "Borrador", descontinuado: "Desactivado" };
const ESTADO_BADGE: Record<ProductStatus, "success" | "neutral" | "danger"> = { activo: "success", borrador: "neutral", descontinuado: "danger" };

function NewProductForm({ categories, onCreated }: { categories: AdminCategoryView[]; onCreated: (id: string) => void }) {
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [categoriaId, setCategoriaId] = useState(categories[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const product = await adminApi.createProduct({ nombre, marca: marca || null, categoriaId });
      onCreated(product.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={shared.form} onSubmit={handleSubmit}>
      <Input label="Nombre del producto" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <Input label="Marca (opcional)" value={marca} onChange={(e) => setMarca(e.target.value)} />
      <Select label="Categoría" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>
      {error && <Toast variant="error" message={error} />}
      <div className={shared.actions}>
        <Button type="submit" disabled={saving || !categoriaId}>
          {saving ? "Creando…" : "Crear y continuar"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminProductsPage() {
  const router = useRouter();
  const permissions = useAdminPermissions();
  const canWrite = permissions.includes("catalog:write");
  const [items, setItems] = useState<AdminProductSummaryView[] | null>(null);
  const [categories, setCategories] = useState<AdminCategoryView[]>([]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<ProductStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    adminApi
      .listProducts({ q: q || undefined, estado: estado || undefined, limit: 50 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el catálogo."));
  }, [q, estado]);

  useEffect(() => {
    adminApi.listCategories().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <div className={shared.header}>
        <h1 className={shared.title}>Catálogo</h1>
        {canWrite && <Button onClick={() => setShowCreate(true)}>+ Nuevo producto</Button>}
      </div>

      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginBottom: "1rem" }}>
        Mantenimiento manual del catálogo. Cuando exista la sincronización con el API del cliente, los productos llegarán por ahí — esta
        pantalla queda como herramienta de mantenimiento (altas puntuales, correcciones, activar/desactivar).
      </p>

      <div className={shared.toolbar}>
        <div className={shared.toolbarField}>
          <Input placeholder="Buscar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className={shared.toolbarField}>
          <Select value={estado} onChange={(e) => setEstado(e.target.value as ProductStatus | "")}>
            <option value="">Todos los estados</option>
            <option value="activo">Publicado</option>
            <option value="borrador">Borrador</option>
            <option value="descontinuado">Desactivado</option>
          </Select>
        </div>
        <Link href="/admin/productos/categorias" className={shared.rowLink} style={{ alignSelf: "center" }}>
          Gestionar categorías →
        </Link>
      </div>

      {error && <Toast variant="error" message={error} />}

      {!items && !error && (
        <div className={shared.tableWrap}>
          <Skeleton style={{ height: 200 }} />
        </div>
      )}

      {items && items.length === 0 && <div className={shared.tableWrap}><p className={shared.empty}>No hay productos con esos filtros.</p></div>}

      {items && items.length > 0 && (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th>Variantes</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/productos/${p.id}`} className={shared.rowLink}>
                      {p.nombre}
                    </Link>
                  </td>
                  <td>{p.marca ?? "—"}</td>
                  <td>{p.categoriaNombre}</td>
                  <td>{p.variantCount}</td>
                  <td>
                    <Badge variant={ESTADO_BADGE[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo producto">
        <NewProductForm categories={categories} onCreated={(id) => router.push(`/admin/productos/${id}`)} />
      </Modal>
    </div>
  );
}
