"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { AdminCategoryView } from "@el-tesoro/shared";
import { Button, Input, Select, Skeleton, Toast } from "@/components/ui";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import { useAdminPermissions } from "../../AdminShell";
import shared from "../../shared.module.css";

export default function AdminCategoriesPage() {
  const permissions = useAdminPermissions();
  const canWrite = permissions.includes("catalog:write");
  const [items, setItems] = useState<AdminCategoryView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminApi
      .listCategories()
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las categorías."));
  }, []);

  useEffect(load, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createCategory({ nombre, parentId: parentId || null });
      setNombre("");
      setParentId("");
      setMessage("Categoría creada.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la categoría.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await adminApi.deleteCategory(id);
      setMessage("Categoría eliminada.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la categoría.");
    }
  }

  return (
    <div>
      <Link href="/admin/productos" className={shared.backLink}>
        ← Volver al catálogo
      </Link>
      <div className={shared.header}>
        <h1 className={shared.title}>Categorías</h1>
      </div>

      {canWrite && (
        <div className={shared.section}>
          <h2 className={shared.sectionTitle}>Nueva categoría</h2>
          <form className={shared.form} onSubmit={handleCreate}>
            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <Select label="Categoría padre (opcional)" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Ninguna (nivel raíz)</option>
              {items?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <div className={shared.actions}>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando…" : "Crear categoría"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {message && <Toast variant="success" message={message} />}
      {error && <Toast variant="error" message={error} />}

      {!items && <Skeleton style={{ height: 200 }} />}

      {items && (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Productos</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>{c.parentId ? `— ${c.nombre}` : c.nombre}</td>
                  <td>{c.productCount}</td>
                  {canWrite && (
                    <td>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(c.id)} disabled={c.productCount > 0}>
                        Eliminar
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
