"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminUserView } from "@el-tesoro/shared";
import { Badge, Button, Input, Select, Skeleton, Toast } from "@/components/ui";
import { ApiError } from "@/services/api";
import * as adminApi from "@/services/adminApi";
import type { InternalRole } from "@/services/adminApi";
import { useUser } from "@/context/UserContext";
import shared from "../shared.module.css";

const ROLE_LABEL: Record<InternalRole, string> = {
  admin: "Administrador",
  staff: "Gerente",
  operador: "Operador",
  servicio_cliente: "Servicio al cliente",
};
const ROLES: InternalRole[] = ["admin", "staff", "operador", "servicio_cliente"];

function NewUserForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<InternalRole>("staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.createUser({ email, nombre, password, role });
      setEmail("");
      setNombre("");
      setPassword("");
      setRole("staff");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={shared.form} onSubmit={handleSubmit}>
      <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <Input
        label="Contraseña inicial"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        helpText="Mínimo 8 caracteres. Compártela con la persona por un canal seguro."
        required
      />
      <Select label="Rol" value={role} onChange={(e) => setRole(e.target.value as InternalRole)}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </Select>
      {error && <Toast variant="error" message={error} />}
      <div className={shared.actions}>
        <Button type="submit" disabled={saving}>
          {saving ? "Creando…" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useUser();
  const [items, setItems] = useState<AdminUserView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .listUsers()
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar los usuarios."));
  }, []);

  useEffect(load, [load]);

  async function handleRoleChange(id: string, role: InternalRole) {
    setBusyId(id);
    setError(null);
    try {
      await adminApi.updateUser(id, { role });
      setMessage("Rol actualizado.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el rol.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActivo(id: string, activo: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await adminApi.updateUser(id, { activo });
      setMessage(activo ? "Usuario reactivado." : "Usuario desactivado.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el usuario.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className={shared.header}>
        <h1 className={shared.title}>Usuarios internos</h1>
      </div>
      <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginBottom: "1rem" }}>
        Cuentas con acceso al panel admin (admin, gerente, operador, servicio al cliente). Las cuentas de clientes se crean desde el sitio
        público y no aparecen aquí.
      </p>

      <div className={shared.section}>
        <h2 className={shared.sectionTitle}>Nuevo usuario</h2>
        <NewUserForm
          onCreated={() => {
            setMessage("Usuario creado.");
            load();
          }}
        />
      </div>

      {message && <Toast variant="success" message={message} />}
      {error && <Toast variant="error" message={error} />}

      {!items && <Skeleton style={{ height: 200 }} />}

      {items && (
        <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    <td>
                      <Select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as InternalRole)}
                        disabled={busyId === u.id || (isSelf && u.role === "admin")}
                        title={isSelf && u.role === "admin" ? "No puedes quitarte a ti mismo el rol de administrador." : undefined}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <Badge variant={u.activo ? "success" : "danger"}>{u.activo ? "Activo" : "Desactivado"}</Badge>
                    </td>
                    <td>
                      <Button
                        variant={u.activo ? "danger" : "outline"}
                        size="sm"
                        onClick={() => handleToggleActivo(u.id, !u.activo)}
                        disabled={busyId === u.id || isSelf}
                        title={isSelf ? "No puedes desactivar tu propia cuenta." : undefined}
                      >
                        {u.activo ? "Desactivar" : "Reactivar"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
