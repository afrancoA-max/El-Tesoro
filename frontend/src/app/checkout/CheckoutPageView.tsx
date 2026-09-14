"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Address, DEPARTAMENTOS_GT, ShippingMethodOption, normalizeTelefonoGt } from "@el-tesoro/shared";
import { Input, Button, Toast, Card, LinkButton } from "@/components/ui";
import { EmptyState } from "@/components/catalog/EmptyState";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { listAddresses } from "@/services/accountApi";
import { fetchShippingMethods, fetchCheckoutConfig, createOrder, CreateOrderAddressInput } from "@/services/checkoutApi";
import { ApiError } from "@/services/api";
import { formatCurrency } from "@/lib/format";
import formStyles from "@/components/account/Form.module.css";
import styles from "./page.module.css";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Identificación",
  2: "Envío",
  3: "Método de envío",
  4: "Resumen",
};

const emptyAddress: CreateOrderAddressInput = {
  nombreDestinatario: "",
  telefono: "",
  departamento: "",
  municipio: "",
  direccion: "",
  referencia: "",
};

export function CheckoutPageView() {
  const router = useRouter();
  const { cart, status: cartStatus, refresh: refreshCart } = useCart();
  const { user } = useUser();

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Interruptor "solo cotizar" (14-sep: sin credenciales de Neonet
  // todavía). Por defecto asume `false` — el estado real de hoy — así que
  // si esta consulta falla o tarda, el checkout nunca ofrece "Pagar" sin
  // pasarela configurada.
  const [pagosEnLineaHabilitado, setPagosEnLineaHabilitado] = useState(false);
  useEffect(() => {
    fetchCheckoutConfig()
      .then((config) => setPagosEnLineaHabilitado(config.pagosEnLineaHabilitado))
      .catch(() => setPagosEnLineaHabilitado(false));
  }, []);
  const accionLabel = pagosEnLineaHabilitado ? "Pagar" : "Cotizar";

  // Paso 1 — identificación (invitado) y facturación FEL.
  const [email, setEmail] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [nit, setNit] = useState(user?.nit ?? "");
  const [nombreFacturacion, setNombreFacturacion] = useState(user?.nombre ?? "");

  // Promesa inline (no setState directo en el cuerpo del efecto) — mismo
  // criterio que UserContext.tsx: deja claro al linter que la actualización
  // ocurre tras una espera, no de forma síncrona en el render del efecto.
  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => {
      setNit((prev) => prev || user.nit || "");
      setNombreFacturacion((prev) => prev || user.nombre || "");
    });
  }, [user]);

  // Paso 2 — envío.
  const [recogerTienda, setRecogerTienda] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [usingNewAddress, setUsingNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<CreateOrderAddressInput>(emptyAddress);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => setUsingNewAddress(true));
      return;
    }
    listAddresses()
      .then(({ items }) => {
        setAddresses(items);
        const predeterminada = items.find((a) => a.esPredeterminada) ?? items[0];
        if (predeterminada) {
          setSelectedAddressId(predeterminada.id);
        } else {
          setUsingNewAddress(true);
        }
      })
      .catch(() => setUsingNewAddress(true));
  }, [user]);

  const selectedSavedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  const departamentoActual = recogerTienda
    ? null
    : usingNewAddress
      ? newAddress.departamento || null
      : (selectedSavedAddress?.departamento ?? null);

  const municipios = useMemo(
    () => DEPARTAMENTOS_GT.find((d) => d.nombre === newAddress.departamento)?.municipios ?? [],
    [newAddress.departamento],
  );

  // Paso 3 — método de envío.
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodOption[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [loadingMethods, setLoadingMethods] = useState(false);

  useEffect(() => {
    if (step !== 3) return;
    Promise.resolve()
      .then(() => setLoadingMethods(true))
      .then(() => fetchShippingMethods(departamentoActual, cart.subtotal))
      .then(({ items }) => {
        setShippingMethods(items);
        if (recogerTienda) setSelectedMethod("recoger_tienda");
      })
      .catch(() => setError("No pudimos consultar los métodos de envío."))
      .finally(() => setLoadingMethods(false));
  }, [step, departamentoActual, cart.subtotal, recogerTienda]);

  const selectedMethodOption = shippingMethods.find((m) => m.codigo === selectedMethod) ?? null;
  const costoEnvio = selectedMethodOption?.disponible ? selectedMethodOption.costo : "0.00";
  const total = (Number(cart.subtotal) + Number(costoEnvio)).toFixed(2);

  if (cartStatus === "ready" && cart.items.length === 0) {
    return (
      <main className={styles.main}>
        <EmptyState
          title="Tu carrito está vacío"
          description="Agrega productos antes de continuar con el checkout."
          action={
            <LinkButton href="/" variant="outline" size="sm">
              Ver catálogo
            </LinkButton>
          }
        />
      </main>
    );
  }

  function canAdvanceFrom(current: Step): boolean {
    if (current === 1) {
      const contactoOk = Boolean(user) || (email.trim().length > 3 && telefonoContacto.trim().length > 0);
      return contactoOk && nit.trim().length > 0 && nombreFacturacion.trim().length > 1;
    }
    if (current === 2) {
      if (recogerTienda) return true;
      if (!usingNewAddress) return Boolean(selectedAddressId);
      return Boolean(
        newAddress.nombreDestinatario && newAddress.telefono && newAddress.departamento && newAddress.municipio && newAddress.direccion,
      );
    }
    if (current === 3) return Boolean(selectedMethod && selectedMethodOption?.disponible);
    return true;
  }

  function goNext() {
    setError(null);
    if (!canAdvanceFrom(step)) {
      setError("Completa los datos de este paso antes de continuar.");
      return;
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  }

  function goBack() {
    setError(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function handlePagar() {
    if (!selectedMethodOption) return;
    setSubmitting(true);
    setError(null);
    try {
      const { order } = await createOrder({
        contacto: user ? undefined : { email: email.trim(), telefono: normalizeTelefonoGt(telefonoContacto) },
        addressId: !recogerTienda && !usingNewAddress ? selectedAddressId : undefined,
        direccion:
          !recogerTienda && usingNewAddress
            ? { ...newAddress, telefono: normalizeTelefonoGt(newAddress.telefono), referencia: newAddress.referencia || undefined }
            : undefined,
        facturacion: { nit: nit.trim(), nombre: nombreFacturacion.trim() },
        metodoEnvioCodigo: selectedMethodOption.codigo,
      });
      await refreshCart();
      const tokenSuffix = order.accessToken ? `?token=${encodeURIComponent(order.accessToken)}` : "";
      router.push(`/checkout/confirmacion/${order.numero}${tokenSuffix}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos crear tu pedido. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Checkout</h1>

      <ol className={styles.steps} aria-label="Progreso del checkout">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <li key={s} className={s === step ? styles.stepActive : s < step ? styles.stepDone : styles.step}>
            {s}. {STEP_LABELS[s]}
          </li>
        ))}
      </ol>

      <div className={styles.layout}>
        <div className={styles.content}>
          {step === 1 && (
            <Card className={styles.card}>
              <h2 className={styles.cardTitle}>Identificación</h2>
              {user ? (
                <p className={formStyles.form}>
                  Continuarás como <strong>{user.nombre}</strong> ({user.email}).
                </p>
              ) : (
                <div className={formStyles.row}>
                  <Input label="Correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input
                    label="Teléfono"
                    type="tel"
                    placeholder="5512-3456"
                    required
                    value={telefonoContacto}
                    onChange={(e) => setTelefonoContacto(e.target.value)}
                  />
                </div>
              )}

              <h2 className={styles.cardTitle}>Datos de facturación (FEL)</h2>
              <div className={formStyles.row}>
                <Input label="NIT o 'CF'" required value={nit} onChange={(e) => setNit(e.target.value)} placeholder="CF" />
                <Input
                  label="Nombre o razón social"
                  required
                  value={nombreFacturacion}
                  onChange={(e) => setNombreFacturacion(e.target.value)}
                />
              </div>
              <p className={styles.note}>
                {pagosEnLineaHabilitado
                  ? "La factura electrónica se emitirá al confirmarse el pago."
                  : "La factura electrónica se emitirá cuando tu cotización se confirme — por ahora solo guardamos estos datos con tu pedido."}
              </p>
            </Card>
          )}

          {step === 2 && (
            <Card className={styles.card}>
              <h2 className={styles.cardTitle}>Dirección de envío</h2>
              <label className={formStyles.checkboxRow}>
                <input type="checkbox" checked={recogerTienda} onChange={(e) => setRecogerTienda(e.target.checked)} />
                Recoger en tienda (sin costo de envío)
              </label>

              {!recogerTienda && (
                <>
                  {user && addresses.length > 0 && (
                    <div className={styles.addressList}>
                      {addresses.map((address) => (
                        <label key={address.id} className={styles.addressOption}>
                          <input
                            type="radio"
                            name="direccion-guardada"
                            checked={!usingNewAddress && selectedAddressId === address.id}
                            onChange={() => {
                              setUsingNewAddress(false);
                              setSelectedAddressId(address.id);
                            }}
                          />
                          <span>
                            <strong>{address.alias || address.nombreDestinatario}</strong> — {address.direccion}, {address.municipio},{" "}
                            {address.departamento}
                          </span>
                        </label>
                      ))}
                      <label className={styles.addressOption}>
                        <input type="radio" name="direccion-guardada" checked={usingNewAddress} onChange={() => setUsingNewAddress(true)} />
                        <span>Usar una dirección nueva</span>
                      </label>
                    </div>
                  )}

                  {usingNewAddress && (
                    <div className={formStyles.form}>
                      <div className={formStyles.row}>
                        <Input
                          label="Nombre del destinatario"
                          required
                          value={newAddress.nombreDestinatario}
                          onChange={(e) => setNewAddress((a) => ({ ...a, nombreDestinatario: e.target.value }))}
                        />
                        <Input
                          label="Teléfono"
                          type="tel"
                          placeholder="5512-3456"
                          required
                          value={newAddress.telefono}
                          onChange={(e) => setNewAddress((a) => ({ ...a, telefono: e.target.value }))}
                        />
                      </div>
                      <div className={formStyles.row}>
                        <div className={formStyles.form}>
                          <label className={styles.selectLabel} htmlFor="checkout-departamento">
                            Departamento
                          </label>
                          <select
                            id="checkout-departamento"
                            required
                            className={styles.select}
                            value={newAddress.departamento}
                            onChange={(e) => setNewAddress((a) => ({ ...a, departamento: e.target.value, municipio: "" }))}
                          >
                            <option value="" disabled>
                              Selecciona un departamento
                            </option>
                            {DEPARTAMENTOS_GT.map((d) => (
                              <option key={d.nombre} value={d.nombre}>
                                {d.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={formStyles.form}>
                          <label className={styles.selectLabel} htmlFor="checkout-municipio">
                            Municipio
                          </label>
                          <select
                            id="checkout-municipio"
                            required
                            disabled={!newAddress.departamento}
                            className={styles.select}
                            value={newAddress.municipio}
                            onChange={(e) => setNewAddress((a) => ({ ...a, municipio: e.target.value }))}
                          >
                            <option value="" disabled>
                              {newAddress.departamento ? "Selecciona un municipio" : "Elige un departamento primero"}
                            </option>
                            {municipios.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <Input
                        label="Dirección"
                        required
                        value={newAddress.direccion}
                        onChange={(e) => setNewAddress((a) => ({ ...a, direccion: e.target.value }))}
                      />
                      <Input
                        label="Referencia (opcional)"
                        value={newAddress.referencia}
                        onChange={(e) => setNewAddress((a) => ({ ...a, referencia: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {step === 3 && (
            <Card className={styles.card}>
              <h2 className={styles.cardTitle}>Método de envío</h2>
              {loadingMethods && <p className={styles.note}>Consultando costos de envío…</p>}
              {!loadingMethods && (
                <div className={styles.addressList}>
                  {shippingMethods.map((method) => (
                    <label
                      key={method.codigo}
                      className={[styles.addressOption, !method.disponible ? styles.addressOptionDisabled : ""].join(" ")}
                    >
                      <input
                        type="radio"
                        name="metodo-envio"
                        disabled={!method.disponible}
                        checked={selectedMethod === method.codigo}
                        onChange={() => setSelectedMethod(method.codigo)}
                      />
                      <span>
                        <strong>{method.nombre}</strong> —{" "}
                        {method.disponible ? (method.gratisPorMonto ? "Gratis" : formatCurrency(method.costo)) : method.motivoNoDisponible}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </Card>
          )}

          {step === 4 && (
            <Card className={styles.card}>
              <h2 className={styles.cardTitle}>Resumen del pedido</h2>
              <ul className={styles.summaryItems}>
                {cart.items.map((item) => (
                  <li key={item.id} className={styles.summaryItem}>
                    <span>
                      {item.nombre} × {item.cantidad}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Envío ({selectedMethodOption?.nombre})</span>
                <span>{formatCurrency(costoEnvio)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Total (IVA incluido)</span>
                <span className={styles.totalValue}>{formatCurrency(total)}</span>
              </div>

              <p className={styles.note}>
                {recogerTienda ? "Recoger en tienda." : "Se envía a la dirección seleccionada."} Facturación a nombre de{" "}
                {nombreFacturacion} ({nit}).
              </p>
              <p className={styles.note}>
                Revisa nuestra{" "}
                <a href="/devoluciones" target="_blank" rel="noreferrer">
                  política de devoluciones y garantías
                </a>{" "}
                antes de confirmar.
              </p>
              <Toast
                variant="info"
                message={
                  pagosEnLineaHabilitado
                    ? "Al confirmar se crea tu pedido y la siguiente pantalla te indica cómo sigue el pago."
                    : "Todavía no cobramos en línea: al confirmar se registra tu cotización y nuestro equipo te contacta para coordinar el pago."
                }
              />
            </Card>
          )}

          {error && <Toast variant="error" message={error} />}

          <div className={formStyles.actions}>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack} disabled={submitting}>
                Atrás
              </Button>
            )}
            {step < 4 && (
              <Button type="button" onClick={goNext}>
                Continuar
              </Button>
            )}
            {step === 4 && (
              <Button type="button" onClick={handlePagar} disabled={submitting}>
                {submitting ? "Procesando…" : `${accionLabel} ${formatCurrency(total)}`}
              </Button>
            )}
          </div>
        </div>

        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>Tu pedido</h2>
          <div className={styles.summaryRow}>
            <span>
              {cart.totalUnidades} {cart.totalUnidades === 1 ? "producto" : "productos"}
            </span>
            <span>{formatCurrency(cart.subtotal)}</span>
          </div>
          {step >= 3 && selectedMethodOption && (
            <div className={styles.summaryRow}>
              <span>Envío</span>
              <span>{formatCurrency(costoEnvio)}</span>
            </div>
          )}
          <div className={styles.totalRow}>
            <span>Total</span>
            <span className={styles.totalValue}>{formatCurrency(step >= 3 && selectedMethodOption ? total : cart.subtotal)}</span>
          </div>
          <p className={styles.summaryNote}>Precios con IVA incluido.</p>
        </aside>
      </div>
    </main>
  );
}
