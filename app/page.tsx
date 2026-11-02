import type { Metadata } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/button";
import { CreateLinkForm } from "@/components/create-link-form";
import { Pill } from "@/components/pill";

export const metadata: Metadata = {
  title: "shorturl — links cortos con analíticas",
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
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-small text-sage transition-colors hover:text-bone"
            >
              Panel
            </Link>
            <Link href="/login" className={buttonClassName("secondary")}>
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center px-8 pb-24 pt-16">
        <section className="rise rise-1 mb-12 flex max-w-[760px] flex-col items-center text-center">
          <span className="mb-6 inline-flex h-6 items-center gap-2 rounded-full border border-line bg-raised px-3 text-micro font-medium uppercase text-sage">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-lime" />
            Analíticas en vivo
          </span>
          <h1 className="font-display text-display-xl font-semibold text-bone">
            <span className="block">Links cortos.</span>
            <span className="block">Datos que sirven.</span>
          </h1>
          <p className="mt-6 max-w-[580px] text-body text-sage">
            Pegá cualquier URL, obtené un link de 7 caracteres y mirá
            exactamente cuándo lo abren.
          </p>
        </section>

        <div className="rise rise-2 w-full max-w-[720px]">
          <CreateLinkForm />
          <p className="mt-4 text-center text-small text-sage-dim">
            Máximo 20 links por hora por IP · los clics de previews también
            cuentan
          </p>
        </div>
      </main>
    </div>
  );
}
