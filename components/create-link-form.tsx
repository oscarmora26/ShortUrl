"use client";

import { useState } from "react";

import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Input } from "@/components/field";

/**
 * S1: the public creation form. It is the only public surface that talks to
 * `POST /api/links`; everything else on the page is server-rendered.
 *
 * The client shows the response contract (302 + `no-store`) and the real
 * `shortUrl` the API returned — never a placeholder link.
 */
type CreatedLink = {
  code: string;
  shortUrl: string;
  targetUrl: string;
  expiresAt: string;
};

const ERROR_BY_STATUS: Record<number, string> = {
  400: "La URL tiene que ser http o https y no superar los 2048 caracteres.",
  429: "Llegaste al máximo de 20 links por hora desde esta IP. Probá más tarde.",
  500: "No pudimos acortar la URL. Probá de nuevo.",
};

function withoutProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function CreateLinkForm() {
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (response.status === 201) {
        setCreated((await response.json()) as CreatedLink);
        return;
      }

      setError(
        ERROR_BY_STATUS[response.status] ??
          "No pudimos acortar la URL. Probá de nuevo.",
      );
    } catch {
      setError("No pudimos llegar al servidor. Revisá tu conexión.");
    } finally {
      setPending(false);
    }
  }

  async function onCopy() {
    if (created === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(created.shortUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="flex w-full flex-col gap-4 shadow-card">
      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <label
          className="text-micro font-medium uppercase text-sage-dim"
          htmlFor="target-url"
        >
          URL original
        </label>
        <div className="flex items-start gap-3">
          <Input
            id="target-url"
            name="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://ejemplo.com/una/url/muy/larga"
            aria-label="URL original"
            spellCheck={false}
            autoComplete="off"
            invalid={error !== null}
            className="flex-1"
            required
          />
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Acortando…" : "Acortar"}
          </Button>
        </div>
        {error ? (
          <p className="text-small text-rust" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <div className="h-px w-full bg-line" />

      <div className="flex flex-col gap-2">
        <span className="text-micro font-medium uppercase text-sage-dim">
          Link generado
        </span>

        <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-raised px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={`size-1.5 shrink-0 rounded-full ${
                created ? "bg-lime" : "bg-line-strong"
              }`}
            />
            {created ? (
              <a
                href={created.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-data-m font-medium text-bone hover:text-lime"
              >
                {withoutProtocol(created.shortUrl)}
              </a>
            ) : (
              <span className="truncate font-mono text-data-m text-sage-dim">
                Todavía no generaste ningún link
              </span>
            )}
          </div>
          {created ? (
            <Button variant="secondary" size="sm" onClick={onCopy}>
              {copied ? "Copiado" : "Copiar"}
            </Button>
          ) : null}
        </div>

        <div className="mt-1 flex flex-col gap-2">
          <div className="flex items-baseline font-mono text-data-s tabular-nums">
            <span className="w-[72px] shrink-0 text-sage-dim">resp.</span>
            <span className="min-w-0 truncate text-sage">
              302 · Cache-Control: no-store
            </span>
          </div>
          <div className="flex items-baseline font-mono text-data-s tabular-nums">
            <span className="w-[72px] shrink-0 text-sage-dim">destino</span>
            <span className="min-w-0 truncate text-sage">
              {created ? withoutProtocol(created.targetUrl) : "—"}
            </span>
          </div>
          <div className="flex items-baseline font-mono text-data-s tabular-nums">
            <span className="w-[72px] shrink-0 text-sage-dim">expira</span>
            <span className="min-w-0 truncate text-sage">
              {created
                ? new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "medium",
                  }).format(new Date(created.expiresAt))
                : "30 días desde la creación"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
