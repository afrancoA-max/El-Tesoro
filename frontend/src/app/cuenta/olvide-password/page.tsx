"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/account/AuthCard";
import { Input, Button, Toast } from "@/components/ui";
import { requestPasswordReset } from "@/services/accountApi";
import formStyles from "@/components/account/Form.module.css";

export default function OlvidePasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    // El backend siempre responde éxito exista o no la cuenta (evita
    // revelar qué correos están registrados), así que aquí no hay un
    // camino de error distinto que mostrar.
    await requestPasswordReset(email).catch(() => undefined);
    setSubmitting(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Revisa tu correo">
        <Toast
          variant="success"
          message={`Si ${email} tiene una cuenta con nosotros, te enviamos un enlace para restablecer tu contraseña.`}
        />
        <Link href="/cuenta/login">Volver a iniciar sesión</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="¿Olvidaste tu contraseña?" description="Te enviaremos un enlace para crear una nueva.">
      <form onSubmit={handleSubmit} noValidate className={formStyles.form}>
        <Input
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
      <p>
        <Link href="/cuenta/login">Volver a iniciar sesión</Link>
      </p>
    </AuthCard>
  );
}
