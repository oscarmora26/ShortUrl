import type { ReactNode } from "react";

import { AdminSidebarToggle } from "@/components/admin-shell";
import { cn } from "@/components/cn";
import { RefreshButton } from "@/components/refresh-button";

/**
 * The 72px admin top bar. It always carries the shell controls — the off-canvas
 * sidebar toggle (below `lg`) and the refresh button — in front of the page's
 * own title and actions. From `lg` up the sidebar already marks the active
 * page, so the whole title block steps aside and the bar becomes an action
 * strip.
 *
 * `titleMode` is a class decision (`lg:hidden`), so the first paint is already
 * right and nothing is measured.
 */
export type PageHeaderTitleMode = "always" | "mobile-only";

export function PageHeader({
  title,
  subtitle,
  actions,
  titleSize = "l",
  titleMode,
  subtitleMode = "always",
}: {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** `m` is the 32px title the approved status screen uses. */
  titleSize?: "l" | "m";
  /**
   * `always` — the title is part of the bar at every width.
   * `mobile-only` — no title from `lg` up; it appears only while the sidebar is
   * an off-canvas overlay. All three admin routes use this one.
   */
  titleMode: PageHeaderTitleMode;
  /**
   * `always` — the subtitle is always there (the status screen's `Hoy`).
   * `from-sm` — a long subtitle waits for room instead of being clipped to two
   * characters on a phone.
   */
  subtitleMode?: "always" | "from-sm";
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-line bg-canvas px-4 lg:gap-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 lg:gap-4">
        <AdminSidebarToggle />
        {title ? (
          <div
            className={cn(
              "flex min-w-0 items-baseline gap-3 lg:gap-4",
              titleMode === "mobile-only" && "lg:hidden",
            )}
          >
            <h1
              className={cn(
                "shrink-0 font-display text-bone",
                titleSize === "l" ? "text-display-l" : "text-display-m",
              )}
            >
              {title}
            </h1>
            {subtitle ? (
              <span
                className={cn(
                  "truncate text-small text-sage-dim",
                  subtitleMode === "from-sm" && "hidden sm:inline",
                )}
              >
                {subtitle}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {actions}
        <RefreshButton />
      </div>
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
