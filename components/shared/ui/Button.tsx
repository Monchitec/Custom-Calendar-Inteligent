"use client";

import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  "primary" | "secondary" | "soft" | "ghost" | "danger";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm border border-transparent",
  secondary:
    "bg-card hover:bg-card-hover text-foreground border border-border shadow-2xs",
  soft: "bg-primary-soft hover:bg-primary/20 text-primary border border-primary/20",
  ghost:
    "bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent",
  danger:
    "bg-danger-soft hover:bg-danger/20 text-danger border border-danger/30",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs rounded-xl gap-1.5",
  md: "min-h-11 px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "min-h-12 px-5 py-3 text-base rounded-2xl gap-2.5",
  icon: "h-10 w-10 p-0 rounded-xl justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center font-semibold transition-all active:scale-[0.98]",
        "focus-visible:ring-primary focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
