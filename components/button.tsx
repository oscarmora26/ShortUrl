import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/components/cn";

/**
 * design/system.md — the single Button implementation.
 *
 * primary   = lime background, lime-ink text (never white)
 * secondary = transparent, 1px line-strong border
 * ghost     = text only
 * danger    = transparent, 1px rust border and rust text
 *
 * Height 40 (`md`), 32 (`sm`). `lg` is the 44px row height that pairs with an
 * Input in the public form and in the login screen.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-lime text-lime-ink font-semibold hover:brightness-[1.08]",
  secondary:
    "border border-line-strong text-bone font-medium hover:border-sage-dim hover:bg-raised",
  ghost: "text-sage font-medium hover:bg-raised hover:text-bone",
  danger: "border border-rust text-rust font-medium hover:bg-rust/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-small",
  md: "h-10 px-4 text-small",
  lg: "h-11 px-6 text-body",
};

export function buttonClassName(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-[filter,background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/**
 * The icon-only button of the admin shell: a 40px square on the `secondary`
 * surface, holding a 16px `currentColor` glyph. One implementation, shared by
 * the refresh control and the off-canvas menu toggle.
 */
export function iconButtonClassName(className?: string): string {
  return cn(
    "flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong text-sage transition-colors hover:bg-raised hover:text-bone disabled:cursor-not-allowed disabled:opacity-40",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, className)}
      {...props}
    />
  );
}
