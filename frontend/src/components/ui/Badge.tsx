import { HTMLAttributes } from "react";
import styles from "./Badge.module.css";

export type BadgeVariant = "neutral" | "gold" | "navy" | "success" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "neutral", className, ...rest }: BadgeProps) {
  const classes = [styles.badge, styles[variant], className].filter(Boolean).join(" ");
  return <span className={classes} {...rest} />;
}
