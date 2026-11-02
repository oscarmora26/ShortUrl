import type { ReactNode } from "react";

/**
 * design/system.md — EmptyState: `display-m` title, one `body` line, one
 * `secondary` action. Centered, 96 vertical padding. Every admin route has one.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h2 className="font-display text-display-m text-bone">{title}</h2>
      <p className="max-w-[420px] text-body text-sage">{description}</p>
      {action}
    </div>
  );
}
