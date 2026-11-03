import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin-shell";
import { requireAdminPage } from "@/lib/admin-guard";

// S7: every `/admin/**` page is behind the owner session; S13: nothing is
// prerendered, so the build never touches the database.
export const dynamic = "force-dynamic";

/**
 * The admin shell: a fixed 264px sidebar from `lg` up and an off-canvas overlay
 * below it, both owned by the `AdminShell` client component. Each page owns its
 * own 72px top bar, because the title, subtitle and actions differ per route
 * (S15). The status screen lives in the `(panel)` route group so that its
 * loading skeleton only ever applies to `/admin`.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminPage();

  return <AdminShell>{children}</AdminShell>;
}
