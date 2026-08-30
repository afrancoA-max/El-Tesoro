"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/account/AuthCard";
import { Input, Button, Toast } from "@/components/ui";
import { resetPassword } from "@/services/accountApi";
import { ApiError } from "@/services/api";
import formStyles from "@/components/account/Form.module.css";

function RestablecerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("Falta el enlace de recuperación. Solicita uno nuevo.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "El enlace es inválido o expiró.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Contraseña actualizada">
        <Toast variant="success" message="Tu contraseña se cambió correctamente. Ya puedes iniciar sesión." />
        <Button onClick={() => router.push("/cuenta/login")}>Iniciar sesión</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crea una nueva contraseña">
      <form onSubmit={handleSubmit} noValidate className={formStyles.form}>
        <Input
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          helpText="Mínimo 8 caracteres, con al menos un número."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Toast variant="error" message={error} />}
        <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
      <p>
        <Link href="/cuenta/login">Volver a iniciar sesión</Link>
      </p>
    </AuthCard>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense fallback={null}>
      <RestablecerForm />
    </Suspense>
  );
}
