"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input, Select } from "@/components/field";
import type { LinkListStatus } from "@/lib/links";

/**
 * S10: the search + status filter of `/admin/links`. Both controls write the
 * query string, so a filtered list stays shareable and the browser's back
 * button keeps working.
 */
export function FilterBar({
  q,
  status,
}: {
  q: string;
  status: LinkListStatus;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  function apply(nextQuery: string, nextStatus: string) {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed !== "") {
      params.set("q", trimmed);
    }
    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }
    const queryString = params.toString();
    router.push(queryString === "" ? "/admin/links" : `/admin/links?${queryString}`);
  }

  return (
    <form
      className="flex flex-1 items-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        apply(query, status);
      }}
    >
      <Input
        name="q"
        size="sm"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por código, URL o destino"
        aria-label="Buscar por código, URL o destino"
        spellCheck={false}
        className="flex-1"
      />
      <Select
        name="status"
        value={status}
        aria-label="Filtrar por estado"
        className="w-40"
        onChange={(event) => apply(query, event.target.value)}
      >
        <option value="all">Estado: Todos</option>
        <option value="active">Estado: Activos</option>
        <option value="disabled">Estado: Deshabilitados</option>
      </Select>
      <button type="submit" className="sr-only">
        Buscar
      </button>
    </form>
  );
}
