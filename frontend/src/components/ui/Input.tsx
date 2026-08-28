import { InputHTMLAttributes, useId } from "react";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
}

export function Input({ label, helpText, errorText, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasError = Boolean(errorText);

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[styles.input, hasError ? styles.error : "", className].filter(Boolean).join(" ")}
        aria-invalid={hasError || undefined}
        aria-describedby={errorText ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
        {...rest}
      />
      {errorText && (
        <span id={`${inputId}-error`} className={styles.errorText} role="alert">
          {errorText}
        </span>
      )}
      {!errorText && helpText && (
        <span id={`${inputId}-help`} className={styles.helpText}>
          {helpText}
        </span>
      )}
    </div>
  );
}
