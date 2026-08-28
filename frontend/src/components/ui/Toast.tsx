import { HTMLAttributes } from "react";
import styles from "./Toast.module.css";

export type ToastVariant = "info" | "success" | "error";

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  message: string;
}

const ICONS: Record<ToastVariant, string> = {
  info: "i",
  success: "✓",
  error: "!",
};

export function Toast({ variant = "info", message, className, ...rest }: ToastProps) {
  const classes = [styles.toast, variant !== "info" ? styles[variant] : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="status" {...rest}>
      <span className={styles.icon} aria-hidden="true">
        {ICONS[variant]}
      </span>
      <span>{message}</span>
    </div>
  );
}
