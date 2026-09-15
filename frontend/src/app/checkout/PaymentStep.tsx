"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Toast } from "@/components/ui";
import { getHostedCheckoutForm, HostedCheckoutForm } from "@/services/paymentsApi";
import { ApiError } from "@/services/api";
import styles from "./PaymentStep.module.css";

export interface PaymentStepProps {
  numero: string;
  accessToken?: string;
}

/// Paso de pago del checkout (Módulo 07, Secure Acceptance Hosted
/// Checkout): pide el formulario ya firmado por el backend y lo manda por
/// POST directo al navegador hacia la página hospedada de CyberSource —
/// una redirección completa fuera del sitio. La tarjeta se captura ahí,
/// nunca en nuestro código. CyberSource devuelve al cliente a
/// `/api/payments/secure-acceptance/receipt` (backend), que verifica la
/// firma de la respuesta y redirige a la pantalla de confirmación — este
/// componente nunca sabe si el pago fue aprobado o no, solo inicia el
/// viaje.
export function PaymentStep({ numero, accessToken }: PaymentStepProps) {
  const [form, setForm] = useState<HostedCheckoutForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    getHostedCheckoutForm(numero, accessToken)
      .then(setForm)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo iniciar el pago. Intenta de nuevo."));
  }, [numero, accessToken]);

  useEffect(() => {
    if (form && formRef.current && !submitted.current) {
      submitted.current = true;
      formRef.current.submit();
    }
  }, [form]);

  return (
    <Card className={styles.card}>
      <h2 className={styles.cardTitle}>Redirigiendo a la pasarela de pago segura…</h2>
      <p className={styles.note}>
        Vas a completar tu pago en la página segura de CyberSource. Tu número de tarjeta nunca pasa por Almacén El Tesoro.
      </p>

      {error && <Toast variant="error" message={error} />}

      {form && (
        <form ref={formRef} action={form.postUrl} method="POST" hidden>
          {Object.entries(form.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        </form>
      )}
    </Card>
  );
}
