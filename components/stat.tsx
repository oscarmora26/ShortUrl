import { cn } from "@/components/cn";

/**
 * design/system.md — Stat: `micro` label, `data-l` value, `small` delta.
 * No icon, no gradient, no animated number.
 */
export type StatTone = "lime" | "rust" | "muted";

const TONES: Record<StatTone, string> = {
  lime: "text-lime",
  rust: "text-rust",
  muted: "text-sage-dim",
};

export type StatProps = {
  label: string;
  value: string;
  delta?: string | null;
  tone?: StatTone;
  className?: string;
};

export function Stat({
  label,
  value,
  delta,
  tone = "muted",
  className,
}: StatProps) {
  return (
    <div
      className={cn(
        "flex min-h-[116px] flex-col justify-between rounded-lg border border-line bg-surface px-6 py-5",
        className,
      )}
    >
      <span className="text-micro font-medium uppercase text-sage-dim">
        {label}
      </span>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-data-l font-medium tabular-nums text-bone">
          {value}
        </span>
        {delta ? (
          <span className={cn("text-small font-medium", TONES[tone])}>
            {delta}
          </span>
        ) : null}
      </div>
    </div>
  );
}
