"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/account/AuthCard";
import { Input, Button, Toast } from "@/components/ui";
import { useUser } from "@/context/UserContext";
import { ApiError } from "@/services/api";
import formStyles from "@/components/account/Form.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.push(searchParams.get("next") || "/cuenta/perfil");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos iniciar sesión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Iniciar sesión">
      <form onSubmit={handleSubmit} noValidate className={formStyles.form}>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Toast variant="error" message={error} />}
        <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
      <p>
        <Link href="/cuenta/olvide-password">¿Olvidaste tu contraseña?</Link>
      </p>
      <p>
        ¿No tienes cuenta? <Link href="/cuenta/registro">Regístrate</Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
