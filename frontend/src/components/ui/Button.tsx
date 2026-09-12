import { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import Link, { LinkProps } from "next/link";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger";
export type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return [styles.button, styles[variant], size === "sm" ? styles.sm : "", className].filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...rest} />;
}

export interface LinkButtonProps extends LinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// CAT-08: para un enlace que se ve como botón (ej. "Proceder al checkout") —
// antes se anidaba <Button> dentro de <Link>, que renderiza un <button>
// dentro de un <a> (HTML inválido). LinkButton renderiza un único <a> con la
// misma apariencia visual que Button.
export function LinkButton({ variant = "primary", size = "md", className, ...rest }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
