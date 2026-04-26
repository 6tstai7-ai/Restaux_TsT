import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "tenant" | "warning" | "success" | "muted";
}

export function Badge({ className, variant = "tenant", ...props }: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full border-[1.5px] bg-transparent px-3.5 py-1.5 text-micro uppercase tracking-[0.08em]";
  const variants: Record<string, string> = {
    tenant: "border-[var(--tenant-accent)] text-[var(--tenant-accent)]",
    warning: "border-[var(--color-warning)] text-[var(--color-warning)]",
    success: "border-[var(--color-success)] text-[var(--color-success)]",
    muted: "border-[var(--color-border-strong)] text-[var(--color-text-muted)]"
  };
  return <div className={cn(base, variants[variant], className)} {...props} />;
}
