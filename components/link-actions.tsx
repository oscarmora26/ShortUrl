"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/button";

/**
 * S11 + the clipboard: the two actions of the link detail. Disabling is a soft
 * delete (`PATCH { status }`), so the click history survives and the same button
 * can re-enable the link.
 */
export function LinkActions({
  code,
  shortUrl,
  disabled,
}: {
  code: string;
  shortUrl: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No pudimos copiar el link.");
    }
  }

  async function onToggle() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/links/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: disabled ? "active" : "disabled" }),
      });

      if (!response.ok) {
        setError(
          response.status === 401
            ? "La sesión expiró. Volvé a entrar."
            : "No pudimos cambiar el estado del link.",
        );
        return;
      }

      router.refresh();
    } catch {
      setError("No pudimos llegar al servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-small text-rust">{error}</span> : null}
      <Button variant="secondary" onClick={onCopy}>
        {copied ? "Copiado" : "Copiar link"}
      </Button>
      <Button
        variant={disabled ? "secondary" : "danger"}
        onClick={onToggle}
        disabled={pending}
      >
        {disabled ? "Habilitar" : "Deshabilitar"}
      </Button>
    </div>
  );
}
