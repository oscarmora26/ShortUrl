import type { Metadata } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/button";
import { Card } from "@/components/card";
import { cn } from "@/components/cn";
import {
  cellClicks,
  cellCode,
  cellDest,
  cellMeta,
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { ExportCsvButton } from "@/components/export-csv-button";
import { FilterBar } from "@/components/filter-bar";
import { formatNumber, formatRelativeTime } from "@/components/format";
import { PageContent, PageHeader } from "@/components/page-header";
import { Pill } from "@/components/pill";
import { requireAdminPage } from "@/lib/admin-guard";
import {
  DEFAULT_PER_PAGE,
  listLinks,
  parseLinkListQuery,
  type LinkListItem,
  type LinkListQuery,
  type LinkListStatus,
} from "@/lib/links";

export const metadata: Metadata = { title: "Links · shorturl" };

// S13: no database access during `npm run build`.
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const FALLBACK_QUERY: LinkListQuery = {
  q: "",
  status: "all",
  page: 1,
  perPage: DEFAULT_PER_PAGE,
};

function firstValue(params: SearchParams, key: string): string | null {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

/**
 * S10 / screen 05 — the links index. Search, status filter and pagination all
 * live in the query string and are validated by the same parser the API uses,
 * so an out-of-range page number simply falls back to the first page.
 */
export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();

  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["q", "status", "page"] as const) {
    const value = firstValue(raw, key);
    if (value !== null) {
      params.set(key, value);
    }
  }

  const parsed = parseLinkListQuery(params);
  const query = parsed.ok ? parsed.query : FALLBACK_QUERY;

  const [page, active, disabled] = await Promise.all([
    listLinks(query),
    listLinks({ q: "", status: "active", page: 1, perPage: 1 }),
    listLinks({ q: "", status: "disabled", page: 1, perPage: 1 }),
  ]);

  const now = Date.now();
  const filtered = query.q.trim() !== "" || query.status !== "all";

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    if (query.q.trim() !== "") {
      next.set("q", query.q.trim());
    }
    if (query.status !== "all") {
      next.set("status", query.status);
    }
    next.set("page", String(target));
    return `/admin/links?${next.toString()}`;
  }

  const csvRows: string[][] = [
    ["codigo", "destino", "clics", "creado", "estado"],
    ...page.items.map((item) => [
      item.code,
      item.targetUrl,
      String(item.clicks),
      item.createdAt,
      item.status,
    ]),
  ];

  const columns: Array<DataTableColumn<LinkListItem>> = [
    {
      key: "code",
      header: "Código",
      width: "120px",
      cell: (item) => (
        <Link
          href={`/admin/links/${item.code}`}
          className={cn(
            cellCode,
            item.status === "disabled" && "text-sage-dim",
          )}
        >
          {item.code}
        </Link>
      ),
    },
    {
      key: "target",
      header: "Destino",
      cell: (item) => (
        <span
          className={cn(
            cellDest,
            item.status === "disabled" && "text-sage-dim",
          )}
          title={item.targetUrl}
        >
          {item.targetUrl.replace(/^https?:\/\//, "")}
        </span>
      ),
    },
    {
      key: "clicks",
      header: "Clics",
      width: "90px",
      align: "right",
      cell: (item) => (
        <span
          className={cn(
            cellClicks,
            item.status === "disabled" && "text-sage-dim",
          )}
        >
          {formatNumber(item.clicks)}
        </span>
      ),
    },
    {
      key: "created",
      header: "Creado",
      width: "130px",
      cell: (item) => (
        <span className={cellMeta}>
          {formatRelativeTime(item.createdAt, now)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: "130px",
      cell: (item) =>
        item.status === "active" ? (
          <Pill dot>Activo</Pill>
        ) : (
          <Pill tone="amber">Deshabilitado</Pill>
        ),
    },
    {
      key: "actions",
      header: "",
      width: "64px",
      align: "right",
      cell: (item) => (
        <Link
          href={`/admin/links/${item.code}`}
          aria-label={`Ver ${item.code}`}
          className="inline-flex size-8 items-center justify-center rounded-sm font-mono text-data-m tracking-[0.1em] text-sage-dim transition-colors hover:bg-surface hover:text-bone"
        >
          ···
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Links"
        subtitle={`${formatNumber(active.total)} activos · ${formatNumber(disabled.total)} deshabilitados`}
      />

      <PageContent>
        <div className="rise rise-1 flex items-center gap-3">
          <FilterBar q={query.q} status={query.status as LinkListStatus} />
          <ExportCsvButton filename="links.csv" rows={csvRows} />
        </div>

        {page.items.length === 0 ? (
          <Card className="rise rise-2">
            <EmptyState
              title={filtered ? "Ningún link coincide" : "Todavía no hay links"}
              description={
                filtered
                  ? "Probá con otro código, otra URL o cambiá el filtro de estado."
                  : "Acortá la primera URL y va a aparecer en este índice con su estado y sus clics."
              }
              action={
                <Link
                  href={filtered ? "/admin/links" : "/"}
                  className={buttonClassName("secondary")}
                >
                  {filtered ? "Limpiar filtros" : "Crear el primero"}
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <Card flush className="rise rise-2">
              <DataTable
                columns={columns}
                rows={page.items}
                rowKey={(item) => item.code}
              />
            </Card>

            <div className="rise rise-3 flex items-center justify-end gap-4">
              <span className="text-small text-sage-dim">
                {formatNumber(page.items.length)} de {formatNumber(page.total)}{" "}
                links · página {formatNumber(page.page)} de{" "}
                {formatNumber(page.pageCount)}
              </span>
              <div className="flex items-center gap-2">
                {page.page > 1 ? (
                  <Link
                    href={pageHref(page.page - 1)}
                    className={buttonClassName("secondary", "sm")}
                  >
                    Anterior
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={buttonClassName(
                      "secondary",
                      "sm",
                      "pointer-events-none opacity-40",
                    )}
                  >
                    Anterior
                  </span>
                )}
                {page.page < page.pageCount ? (
                  <Link
                    href={pageHref(page.page + 1)}
                    className={buttonClassName("secondary", "sm")}
                  >
                    Siguiente
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={buttonClassName(
                      "secondary",
                      "sm",
                      "pointer-events-none opacity-40",
                    )}
                  >
                    Siguiente
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}
