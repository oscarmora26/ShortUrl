"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** S6: `POST /api/auth/logout` clears the session cookie, then back to /login. */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className="rounded-sm px-2 py-1 text-small text-sage transition-colors hover:text-bone disabled:opacity-40"
    >
      Salir
    </button>
  );
}
