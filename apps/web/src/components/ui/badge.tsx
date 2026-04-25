import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "secondary";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground",
    outline: "border text-foreground",
    secondary: "bg-secondary text-secondary-foreground"
  };
  return <div className={cn(base, variants[variant], className)} {...props} />;
}
