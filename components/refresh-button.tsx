"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { iconButtonClassName } from "@/components/button";
import { cn } from "@/components/cn";

/**
 * Re-runs the current route's data fetch without leaving the page. It sits in
 * the shared 72px top bar next to each page's own actions, and while the
 * refresh is in flight it is disabled and its icon turns — which is why the
 * `main` landmark keeps the data it already has instead of flashing a
 * skeleton.
 */
export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="Actualizar datos"
      title="Actualizar datos"
      aria-busy={pending}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className={iconButtonClassName(className)}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("size-4", pending && "motion-safe:animate-spin")}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </button>
  );
}
