"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/account/AuthCard";
import { Toast, Button } from "@/components/ui";
import { verifyEmail } from "@/services/accountApi";
import { ApiError } from "@/services/api";

function VerificarContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Falta el enlace de verificación. Revisa el correo que te enviamos.");
      return;
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "El enlace es inválido o expiró.");
      });
  }, [token]);

  return (
    <AuthCard title="Verificación de correo">
      {status === "loading" && <Toast variant="info" message="Confirmando tu correo…" />}
      {status === "success" && (
        <>
          <Toast variant="success" message="¡Tu correo quedó confirmado!" />
          <Button onClick={() => (window.location.href = "/cuenta/login")}>Iniciar sesión</Button>
        </>
      )}
      {status === "error" && (
        <>
          <Toast variant="error" message={message} />
          <p>
            <Link href="/cuenta/login">Volver a iniciar sesión</Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}

export default function VerificarPage() {
  return (
    <Suspense fallback={null}>
      <VerificarContent />
    </Suspense>
  );
}
