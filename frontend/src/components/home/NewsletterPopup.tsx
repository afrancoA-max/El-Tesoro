"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Image from "next/image";
import { Input, Button, Toast } from "@/components/ui";
import { subscribeToNewsletter } from "@/services/newsletterApi";
import { ApiError } from "@/services/api";
import styles from "./NewsletterPopup.module.css";

const DISMISSED_KEY = "eltesoro_newsletter_dismissed";
// Qué tan cerca del final de la página debe estar el usuario para que
// aparezca — no hasta el último píxel, para no sentirse como un salto
// brusco justo al tocar el footer.
const SCROLL_THRESHOLD_PX = 500;

export interface NewsletterPopupProps {
  images?: (string | null)[];
}

export function NewsletterPopup({ images = [] }: NewsletterPopupProps) {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // localStorage puede fallar (modo privado estricto) — en ese caso
      // simplemente no persiste la preferencia entre visitas, no es fatal.
    }
    if (dismissed) return;

    let ticking = false;
    function handleScroll() {
      if (shownRef.current || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const nearBottom =
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - SCROLL_THRESHOLD_PX;
        if (nearBottom) {
          shownRef.current = true;
          setOpen(true);
          window.removeEventListener("scroll", handleScroll);
        }
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function dismissForever() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ver comentario arriba.
    }
  }

  function handleClose() {
    setOpen(false);
    dismissForever();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await subscribeToNewsletter({ nombre, apellido, email });
      setSuccess(true);
      dismissForever();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos completar tu suscripción. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const visualImages = images.filter((img): img is string => Boolean(img)).slice(0, 4);

  return (
    <div className={styles.overlay} role="presentation" onClick={handleClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Cerrar">
          ×
        </button>

        <div className={styles.formSide}>
          {success ? (
            <div className={styles.successState}>
              <h2 className={styles.title}>¡Ya estás suscrito!</h2>
              <p className={styles.subtitle}>Te avisaremos por correo cuando tengamos ofertas y novedades.</p>
              <Button onClick={handleClose}>Seguir viendo la tienda</Button>
            </div>
          ) : (
            <>
              <h2 id="newsletter-title" className={styles.title}>
                Suscríbete
              </h2>
              <p className={styles.subtitle}>Para recibir ofertas y novedades de Almacén El Tesoro.</p>
              <form onSubmit={handleSubmit} noValidate className={styles.form}>
                <Input
                  placeholder="Nombre"
                  aria-label="Nombre"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
                <Input
                  placeholder="Apellido"
                  aria-label="Apellido"
                  required
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Correo electrónico"
                  aria-label="Correo electrónico"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && <Toast variant="error" message={error} />}
                <Button type="submit" disabled={submitting} style={{ width: "100%" }}>
                  {submitting ? "Enviando…" : "Enviar"}
                </Button>
              </form>
              <p className={styles.legal}>
                Al suscribirte, estás de acuerdo con recibir correos promocionales. Puedes darte de baja cuando quieras.
              </p>
            </>
          )}
        </div>

        <div className={styles.visualSide}>
          {visualImages.length > 0 && (
            <div className={styles.imageGrid} aria-hidden="true">
              {visualImages.map((src) => (
                <div key={src} className={styles.imageCell}>
                  <Image src={src} alt="" fill sizes="200px" />
                </div>
              ))}
            </div>
          )}
          <div className={styles.visualCaption}>
            <span className={styles.visualBadge}>Ofertas exclusivas</span>
            <p>Novedades y descuentos para tu cocina y tu hogar, directo a tu correo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
