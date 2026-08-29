import { HTMLAttributes } from "react";
import styles from "./Skeleton.module.css";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "block";
}

export function Skeleton({ variant = "block", className, ...rest }: SkeletonProps) {
  const classes = [styles.skeleton, variant === "text" ? styles.text : "", className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes} aria-hidden="true" {...rest} />;
}
