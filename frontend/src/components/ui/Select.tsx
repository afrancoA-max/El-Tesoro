import { SelectHTMLAttributes, useId } from "react";
import styles from "./Input.module.css";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
}

// Módulo 08: reusa exactamente los estilos de Input (mismo Input.module.css)
// — el panel admin no necesita un lenguaje visual propio para un campo tan
// simple como un <select>.
export function Select({ label, helpText, errorText, id, className, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hasError = Boolean(errorText);

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[styles.input, hasError ? styles.error : "", className].filter(Boolean).join(" ")}
        aria-invalid={hasError || undefined}
        {...rest}
      >
        {children}
      </select>
      {errorText && (
        <span className={styles.errorText} role="alert">
          {errorText}
        </span>
      )}
      {!errorText && helpText && <span className={styles.helpText}>{helpText}</span>}
    </div>
  );
}
