"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/components/cn";

/**
 * design/system.md — NavItem: 40 tall, radius 8, `small` 500.
 *
 * Active: `--raised` background + a 2x14 `--lime` bar on the left + `--bone`
 * text. Inactive: `--sage` text, no bar. Membership is derived from the current
 * path, so `/admin/links/x7Kd2pQ` keeps the Links entry active.
 */
export function NavItem({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active =
    pathname === href ||
    (href !== "/admin" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center rounded-md px-3 text-small font-medium transition-colors",
        active
          ? "bg-raised text-bone"
          : "text-sage hover:bg-raised hover:text-bone",
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-sm bg-lime"
        />
      ) : null}
      {children}
    </Link>
  );
}
