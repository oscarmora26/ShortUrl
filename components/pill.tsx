import type { ReactNode } from "react";

import { cn } from "@/components/cn";

/**
 * design/system.md — Pill: 24 tall, radius full, `--raised`, `micro` text,
 * optional 6px dot. `tone="amber"` is the disabled / expiring state.
 */
export type PillTone = "default" | "amber";

const TONES: Record<PillTone, { text: string; dot: string }> = {
  default: { text: "text-bone", dot: "bg-lime" },
  amber: { text: "text-amber", dot: "bg-amber" },
};

export function Pill({
  children,
  dot = false,
  tone = "default",
  className,
}: {
  children: ReactNode;
  dot?: boolean;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 text-micro font-medium uppercase",
        TONES[tone].text,
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", TONES[tone].dot)}
        />
      ) : null}
      {children}
    </span>
  );
}
