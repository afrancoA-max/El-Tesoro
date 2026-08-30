"use client";

import { useState, FormEvent } from "react";
import { ProtectedRoute } from "@/components/account/ProtectedRoute";
import { AccountShell } from "@/components/account/AccountShell";
import { Input, Button, Toast } from "@/components/ui";
import { useUser } from "@/context/UserContext";
import { updateProfile, resendVerification } from "@/services/accountApi";
import { ApiError } from "@/services/api";
import formStyles from "@/components/account/Form.module.css";

function PerfilForm() {
  const { user, refresh } = useUser();
  const [nombre, setNombre] = useState(user?.nombre ?? "");
  const [telefono, setTelefono] = useState(user?.telefono ?? "");
  const [nit, setNit] = useState(user?.nit ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await updateProfile({ nombre, telefono, nit });
      await refresh();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar los cambios.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!user) return;
    setResending(true);
    await resendVerification(user.email).catch(() => undefined);
    setResending(false);
    setResendSent(true);
  }

  if (!user) return null;

  return (
    <AccountShell title="Mi perfil">
      {!user.emailVerified && (
        <Toast
          variant="info"
          message={
            resendSent
              ? "Te reenviamos el enlace de confirmación. Revisa tu correo."
              : "Tu correo aún no está confirmado."
          }
          style={{ marginBottom: 16 }}
        />
      )}
      {!user.emailVerified && !resendSent && (
        <Button variant="outline" size="sm" onClick={handleResend} disabled={resending} style={{ marginBottom: 24 }}>
          {resending ? "Enviando…" : "Reenviar correo de confirmación"}
        </Button>
      )}

      <form onSubmit={handleSubmit} noValidate className={formStyles.form} style={{ maxWidth: 480 }}>
        <Input label="Correo electrónico" type="email" value={user.email} disabled helpText="El correo no se puede cambiar." />
        <Input label="Nombre completo" type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input
          label="Teléfono"
          type="tel"
          placeholder="5512-3456"
          value={telefono ?? ""}
          onChange={(e) => setTelefono(e.target.value)}
          helpText="8 dígitos, para coordinar entregas."
        />
        <Input
          label="NIT"
          type="text"
          placeholder="CF o tu NIT"
          value={nit ?? ""}
          onChange={(e) => setNit(e.target.value)}
          helpText="Para tu factura. Usa 'CF' si no necesitas NIT."
        />
        {error && <Toast variant="error" message={error} />}
        {success && <Toast variant="success" message="Cambios guardados." />}
        <Button type="submit" disabled={submitting} style={{ alignSelf: "flex-start" }}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </Button>
      </form>
    </AccountShell>
  );
}

export default function PerfilPage() {
  return (
    <ProtectedRoute>
      <PerfilForm />
    </ProtectedRoute>
  );
}
