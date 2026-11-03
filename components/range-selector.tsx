"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/components/cn";

/**
 * S9's range control. Each option is still a real `<Link>` (crawlable, openable
 * in a new tab), but a plain left click is handled by the router inside
 * `startTransition`: the current numbers stay on screen while the new range
 * loads, and the control dims with a small spinner instead of the whole page
 * being replaced by a skeleton.
 */
export function RangeSelector({
  range,
  ranges,
}: {
  range: number;
  ranges: readonly number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSelect(
    event: React.MouseEvent<HTMLAnchorElement>,
    value: number,
  ) {
    // Modifier clicks, middle clicks and non-primary buttons keep the link.
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    if (value === range) {
      return;
    }

    startTransition(() => {
      router.replace(`/admin/analytics?range=${value}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div
        role="group"
        aria-label="Rango de tiempo"
        aria-busy={pending}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md border border-line bg-surface p-0.5 transition-opacity",
          pending && "opacity-60",
        )}
      >
        {ranges.map((value) => {
          const current = value === range;
          return (
            <Link
              key={value}
              href={`/admin/analytics?range=${value}`}
              aria-current={current ? "true" : undefined}
              onClick={(event) => onSelect(event, value)}
              className={cn(
                "relative inline-flex h-8 items-center justify-center rounded-sm px-4 text-small font-medium transition-colors",
                current
                  ? "bg-raised text-bone after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-t-sm after:bg-lime"
                  : "text-sage hover:text-bone",
              )}
            >
              {value} d
            </Link>
          );
        })}
      </div>

      {/* The slot is always laid out, so becoming pending never shifts the row. */}
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center text-sage-dim",
          !pending && "invisible",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          className={cn("size-4", pending && "motion-safe:animate-spin")}
        >
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      </span>

      <span role="status" className="sr-only">
        {pending ? "Actualizando datos" : ""}
      </span>
    </div>
  );
}
