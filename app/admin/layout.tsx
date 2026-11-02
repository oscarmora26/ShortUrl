import Link from "next/link";
import type { ReactNode } from "react";

import { NavItem } from "@/components/nav-item";
import { Pill } from "@/components/pill";
import { requireAdminPage } from "@/lib/admin-guard";

import { LogoutButton } from "./logout-button";

// S7: every `/admin/**` page is behind the owner session; S13: nothing is
// prerendered, so the build never touches the database.
export const dynamic = "force-dynamic";

/**
 * The admin shell: a fixed 264px sidebar and the content column. Each page owns
 * its own 72px top bar, because the title, subtitle and actions differ per
 * route (S15).
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPage();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-[264px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex h-[72px] shrink-0 items-center gap-2 px-6">
          <Link
            href="/admin"
            className="font-display text-title font-semibold tracking-[-0.03em] text-bone"
          >
            shorturl
          </Link>
          <Pill className="text-sage">v1</Pill>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-4 py-3">
          <NavItem href="/admin">Panel</NavItem>
          <NavItem href="/admin/links">Links</NavItem>
          <NavItem href="/admin/analytics">Analíticas</NavItem>
        </nav>

        {/* S16: there is no user model, so the footer names the role, not a
            person, and offers the only account action that exists. */}
        <div className="flex items-center justify-between border-t border-line px-6 py-5">
          <div className="flex flex-col">
            <span className="text-small font-semibold leading-tight text-bone">
              Dueño
            </span>
            <span className="mt-0.5 text-micro font-medium uppercase text-sage-dim">
              Sesión de 7 días
            </span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
