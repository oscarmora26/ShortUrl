import type { ReactNode } from "react";

import { cn } from "@/components/cn";

/**
 * design/system.md — Card: `--surface`, 1px `--line`, radius 12, padding 24.
 *
 * `flush` removes the padding for a card that wraps a table, so the hairline
 * separators reach the edges. No shadows, except the public form card which
 * opts in with `shadow-card`.
 */
export type CardProps = {
  children: ReactNode;
  className?: string;
  flush?: boolean;
};

export function Card({ children, className, flush = false }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-line bg-surface",
        flush ? "overflow-hidden" : "p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** `title` scale, used by every card heading. */
export function CardTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-title font-semibold text-bone", className)}>
      {children}
    </h2>
  );
}

/** `micro` uppercase label, for card eyebrows and stat labels. */
export function CardLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-micro font-medium uppercase text-sage-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}
