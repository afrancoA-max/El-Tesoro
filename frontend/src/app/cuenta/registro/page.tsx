"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/account/AuthCard";
import { Input, Button, Toast } from "@/components/ui";
import { registerAccount } from "@/services/accountApi";
import { ApiError } from "@/services/api";
import formStyles from "@/components/account/Form.module.css";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerAccount({ nombre, email, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos crear tu cuenta. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Revisa tu correo">
        <Toast
          variant="success"
          message={`Te enviamos un enlace de confirmación a ${email}. Ábrelo para activar tu cuenta.`}
        />
        <Button variant="outline" onClick={() => router.push("/cuenta/login")}>
          Ir a iniciar sesión
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crear cuenta" description="Guarda tus direcciones y consulta tus pedidos más rápido.">
      <form onSubmit={handleSubmit} noValidate className={formStyles.form}>
        <Input
          label="Nombre completo"
          type="text"
          autoComplete="name"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          helpText="Mínimo 8 caracteres, con al menos un número."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Toast variant="error" message={error} />}
        <Button type="submit" disabled={submitting} style={{ width: "100%", marginTop: 8 }}>
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
      <p>
        ¿Ya tienes cuenta? <Link href="/cuenta/login">Inicia sesión</Link>
      </p>
    </AuthCard>
  );
}
