"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/button";
import { Field, Input } from "@/components/field";

/**
 * S6: the owner password is the only credential. A wrong password is `401` and
 * nothing in the response says which half was wrong, so the form does not
 * either.
 */
export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.status === 204) {
        router.replace("/admin");
        return;
      }

      setError(
        response.status === 401
          ? "Contraseña incorrecta."
          : "No pudimos iniciar la sesión. Probá de nuevo.",
      );
    } catch {
      setError("No pudimos llegar al servidor. Revisá tu conexión.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex w-full flex-col" onSubmit={onSubmit}>
      <div className="mb-6 flex flex-col gap-2">
        <span className="text-micro font-medium uppercase text-sage-dim">
          Acceso al panel
        </span>
        <h1 className="font-display text-display-m font-semibold text-bone">
          Entrá a tus métricas
        </h1>
      </div>

      <Field label="Contraseña" htmlFor="owner-password" error={error}>
        <Input
          id="owner-password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          spellCheck={false}
          invalid={error !== null}
          className="w-full font-mono tracking-[0.25em]"
        />
      </Field>

      {/* S6: the session always lasts 7 days, so this states the duration
          instead of offering a switch that could not change it. */}
      <div className="mb-6 mt-6 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-lime bg-lime"
        >
          <svg viewBox="0 0 10 10" className="size-2.5">
            <path
              d="M1.5 5.2L3.8 7.5L8.5 2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-lime-ink"
            />
          </svg>
        </span>
        <span className="text-small text-sage">Recordarme 7 días</span>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>

      <div className="mb-6 mt-8 h-px w-full bg-line" />

      <p className="text-small text-sage-dim">
        Sesión firmada en este navegador. Sin correo, sin registro.
      </p>
    </form>
  );
}
