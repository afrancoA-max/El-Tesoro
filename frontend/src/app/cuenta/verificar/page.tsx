"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/account/AuthCard";
import { Toast, Button } from "@/components/ui";
import { verifyEmail } from "@/services/accountApi";
import { ApiError } from "@/services/api";

function VerificarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // Sin token no hay nada que verificar — es un dato derivable en el
  // render, no un resultado que dependa de un efecto (evita el setState
  // síncrono dentro del efecto que marca react-hooks/set-state-in-effect).
  const [asyncStatus, setAsyncStatus] = useState<"loading" | "success" | "error">("loading");
  const [asyncMessage, setAsyncMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(() => setAsyncStatus("success"))
      .catch((err) => {
        setAsyncStatus("error");
        setAsyncMessage(err instanceof ApiError ? err.message : "El enlace es inválido o expiró.");
      });
  }, [token]);

  const status = token ? asyncStatus : "error";
  const message = token ? asyncMessage : "Falta el enlace de verificación. Revisa el correo que te enviamos.";

  return (
    <AuthCard title="Verificación de correo">
      {status === "loading" && <Toast variant="info" message="Confirmando tu correo…" />}
      {status === "success" && (
        <>
          <Toast variant="success" message="¡Tu correo quedó confirmado!" />
          <Button onClick={() => router.push("/cuenta/login")}>Iniciar sesión</Button>
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
