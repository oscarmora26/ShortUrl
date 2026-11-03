import type { Metadata } from "next";
import Link from "next/link";

import { CreateLinkForm } from "@/components/create-link-form";
import { Pill } from "@/components/pill";

export const metadata: Metadata = {
  title: "shorturl — links cortos",
};

/**
 * Screen 01 — the public creation page. Open to everyone (S7): no session, no
 * database read. The only dynamic part is the form's `POST /api/links`.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 h-[72px] border-b border-line bg-canvas">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-display text-title font-semibold tracking-[-0.03em] text-bone"
            >
              shorturl
            </Link>
            <Pill className="text-sage">v1</Pill>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-center px-8 pb-24 pt-16">
        <section className="rise rise-1 mb-12 flex max-w-[760px] flex-col items-center text-center">
          <h1 className="font-display text-display-xl font-semibold text-bone">
            <span className="block">Links cortos.</span>
            <span className="block">Datos que sirven.</span>
          </h1>
        </section>

        <div className="rise rise-2 w-full max-w-[720px]">
          <CreateLinkForm />
        </div>
      </main>
    </div>
  );
}
