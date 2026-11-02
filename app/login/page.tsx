import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Pill } from "@/components/pill";
import {
  getAdminSessionFromCookieValue,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · shorturl",
};

// The page reads the session cookie, so it is never prerendered (S13).
export const dynamic = "force-dynamic";

/**
 * Screen 03 — owner login. Split layout: the surface panel on the left, the
 * form column on the right. An already valid session skips straight to the
 * panel, mirroring how `requireAdminPage` sends the unauthenticated the other
 * way (S7).
 */
export default async function LoginPage() {
  const store = await cookies();
  const session = await getAdminSessionFromCookieValue(
    store.get(SESSION_COOKIE_NAME)?.value ?? null,
  );
  if (session !== null) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[44%] flex-col justify-between border-r border-line bg-surface p-8 md:flex">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-title font-semibold tracking-[-0.03em] text-bone"
        >
          shorturl
          <Pill className="rounded-sm px-2 font-mono">v1</Pill>
        </Link>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-display-m font-semibold text-bone">
            El panel es tuyo.
          </h2>
          <p className="text-small text-sage">
            Los links son públicos. Las métricas, no.
          </p>
        </div>
      </aside>

      <main className="flex w-full items-center justify-center bg-canvas p-8 md:w-[56%]">
        <div className="w-full max-w-[380px]">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
