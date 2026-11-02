import type { ReactNode } from "react";

import { cn } from "@/components/cn";

/**
 * The 72px admin top bar: `display-l` page title, a `small` subtitle and the
 * page's own actions on the right. One implementation, used by every admin
 * route that has a title (the link detail replaces it with the code bar).
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  titleSize = "l",
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** `m` is the 32px title the approved status screen uses. */
  titleSize?: "l" | "m";
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-6 border-b border-line bg-canvas px-8">
      <div className="flex min-w-0 items-baseline gap-4">
        <h1
          className={cn(
            "font-display text-bone",
            titleSize === "l" ? "text-display-l" : "text-display-m",
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <span className="truncate text-small text-sage-dim">{subtitle}</span>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}

/** The shared inner wrapper for admin content: 32 padding, 24 gaps, max 1120. */
export function PageContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-[1120px] flex-col gap-6 p-8">
      {children}
    </div>
  );
}
