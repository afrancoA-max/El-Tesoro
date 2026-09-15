import { TextareaHTMLAttributes, useId } from "react";
import styles from "./Input.module.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
  errorText?: string;
}

export function Textarea({ label, helpText, errorText, id, className, ...rest }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hasError = Boolean(errorText);

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={[styles.input, hasError ? styles.error : "", className].filter(Boolean).join(" ")}
        aria-invalid={hasError || undefined}
        {...rest}
      />
      {errorText && (
        <span className={styles.errorText} role="alert">
          {errorText}
        </span>
      )}
      {!errorText && helpText && <span className={styles.helpText}>{helpText}</span>}
    </div>
  );
}
