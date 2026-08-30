"use client";

import { useMemo, useState, FormEvent, CSSProperties } from "react";
import { Address, DEPARTAMENTOS_GT } from "@el-tesoro/shared";
import { Input, Button, Toast } from "@/components/ui";
import { AddressInput } from "@/services/accountApi";
import { ApiError } from "@/services/api";
import formStyles from "./Form.module.css";

export interface AddressFormProps {
  initial?: Address;
  onSubmit: (input: AddressInput) => Promise<void>;
  onCancel: () => void;
}

export function AddressForm({ initial, onSubmit, onCancel }: AddressFormProps) {
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [nombreDestinatario, setNombreDestinatario] = useState(initial?.nombreDestinatario ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [departamento, setDepartamento] = useState(initial?.departamento ?? "");
  const [municipio, setMunicipio] = useState(initial?.municipio ?? "");
  const [direccion, setDireccion] = useState(initial?.direccion ?? "");
  const [referencia, setReferencia] = useState(initial?.referencia ?? "");
  const [esPredeterminada, setEsPredeterminada] = useState(initial?.esPredeterminada ?? false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const municipios = useMemo(
    () => DEPARTAMENTOS_GT.find((d) => d.nombre === departamento)?.municipios ?? [],
    [departamento],
  );

  function handleDepartamentoChange(value: string) {
    setDepartamento(value);
    setMunicipio(""); // el municipio anterior puede no pertenecer al nuevo departamento
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        alias: alias || undefined,
        nombreDestinatario,
        telefono,
        departamento,
        municipio,
        direccion,
        referencia: referencia || undefined,
        esPredeterminada,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar la dirección.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={formStyles.form}>
      <Input
        label="Alias (opcional)"
        placeholder="Casa, oficina…"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
      />
      <div className={formStyles.row}>
        <Input
          label="Nombre del destinatario"
          required
          value={nombreDestinatario}
          onChange={(e) => setNombreDestinatario(e.target.value)}
        />
        <Input
          label="Teléfono"
          type="tel"
          placeholder="5512-3456"
          required
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
      </div>
      <div className={formStyles.row}>
        <div className={formStyles.form}>
          <label htmlFor="address-departamento" style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
            Departamento
          </label>
          <select
            id="address-departamento"
            required
            value={departamento}
            onChange={(e) => handleDepartamentoChange(e.target.value)}
            style={selectStyle}
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
          <label htmlFor="address-municipio" style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
            Municipio
          </label>
          <select
            id="address-municipio"
            required
            disabled={!departamento}
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            style={selectStyle}
          >
            <option value="" disabled>
              {departamento ? "Selecciona un municipio" : "Elige un departamento primero"}
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
        placeholder="5ta avenida 10-20, zona 1"
        required
        value={direccion}
        onChange={(e) => setDireccion(e.target.value)}
      />
      <Input
        label="Referencia (opcional)"
        placeholder="Portón negro, frente a la farmacia"
        value={referencia}
        onChange={(e) => setReferencia(e.target.value)}
      />
      <label className={formStyles.checkboxRow}>
        <input type="checkbox" checked={esPredeterminada} onChange={(e) => setEsPredeterminada(e.target.checked)} />
        Usar como dirección predeterminada
      </label>

      {error && <Toast variant="error" message={error} />}

      <div className={formStyles.actions}>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar dirección"}
        </Button>
      </div>
    </form>
  );
}

const selectStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--font-size-base)",
  color: "var(--color-text-primary)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border-strong)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-3) var(--space-4)",
  minHeight: 44,
};
