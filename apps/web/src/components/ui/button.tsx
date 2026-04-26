import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg text-sm font-semibold min-h-[48px] px-6 py-3.5 transition-colors duration-180 ease-out-punched focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:pointer-events-none disabled:opacity-50";
    const variants: Record<string, string> = {
      primary:
        "bg-[var(--tenant-accent)] text-[var(--tenant-accent-ink)] hover:bg-[var(--tenant-accent-hover)]",
      secondary:
        "bg-transparent text-[var(--color-text)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]",
      ghost:
        "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
    };
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
