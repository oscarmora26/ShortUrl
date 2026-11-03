import type { Metadata } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/button";
import { Card, CardLabel, CardTitle } from "@/components/card";
import {
  cellClicks,
  cellCode,
  cellDest,
  cellMeta,
  DataTable,
  type DataTableColumn,
} from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/field";
import {
  formatCompactRelativeTime,
  formatDayMonth,
  formatDelta,
  formatNumber,
  formatRelativeTime,
  formatTimeOfDay,
  localDateKey,
} from "@/components/format";
import { PageContent, PageHeader } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { getAnalytics, getLinkStats, type LinkStats } from "@/lib/analytics";
import { requireAdminPage } from "@/lib/admin-guard";
import { getAnalyticsTimeZone } from "@/lib/config";
import { listLinks, type LinkListItem } from "@/lib/links";

export const metadata: Metadata = { title: "Panel · shorturl" };

// S13: no database access during `npm run build`.
export const dynamic = "force-dynamic";

type Row = { item: LinkListItem; stats: LinkStats };

/**
 * S15 / screen 04 — the status screen. Today only: clicks today, active links,
 * last click, created today, recent activity, top today, and the links table.
 * The 30-day series lives on analytics and on a link's detail, never here.
 */
export default async function AdminPanelPage() {
  await requireAdminPage();

  const timeZone = getAnalyticsTimeZone();
  const [all, active, analytics] = await Promise.all([
    listLinks({ q: "", status: "all", page: 1, perPage: 20 }),
    listLinks({ q: "", status: "active", page: 1, perPage: 1 }),
    getAnalytics(7),
  ]);

  const statsByLink = await Promise.all(
    all.items.map((item) => getLinkStats(item.code)),
  );
  const rows: Row[] = all.items.flatMap((item, index) => {
    const stats = statsByLink[index];
    return stats ? [{ item, stats }] : [];
  });

  const now = Date.now();
  const todayKey = localDateKey(new Date(now), timeZone);
  const lastDays = analytics.days.slice(-2);
  const clicksToday = lastDays[1]?.count ?? 0;
  const clicksYesterday = lastDays[0]?.count ?? 0;
  const delta = clicksToday - clicksYesterday;
  const createdToday = all.items.filter(
    (item) => localDateKey(new Date(item.createdAt), timeZone) === todayKey,
  ).length;

  const latestClicks = rows
    .map((row) => ({ row, lastClick: row.stats.activity.lastClick }))
    .filter(
      (entry): entry is { row: Row; lastClick: string } =>
        entry.lastClick !== null,
    )
    .sort((left, right) => right.lastClick.localeCompare(left.lastClick));

  const lastClickAt = latestClicks[0]?.lastClick ?? null;
  const recent = latestClicks.slice(0, 8);
  const topToday = rows
    .map((row) => ({ code: row.item.code, clicks: row.stats.clicksToday }))
    .filter((entry) => entry.clicks > 0)
    .sort((left, right) => right.clicks - left.clicks)
    .slice(0, 3);

  const tableColumns: Array<DataTableColumn<LinkListItem>> = [
    {
      key: "code",
      header: "Código",
      width: "130px",
      cell: (item) => (
        <Link href={`/admin/links/${item.code}`} className={cellCode}>
          {item.code}
        </Link>
      ),
    },
    {
      key: "target",
      header: "Destino",
      cell: (item) => (
        <span className={cellDest} title={item.targetUrl}>
          {item.targetUrl.replace(/^https?:\/\//, "")}
        </span>
      ),
    },
    {
      key: "clicks",
      header: "Clics",
      width: "110px",
      align: "right",
      cell: (item) => (
        <span className={cellClicks}>{formatNumber(item.clicks)}</span>
      ),
    },
    {
      key: "created",
      header: "Creado",
      width: "130px",
      cell: (item) => (
        <span className={cellMeta}>{formatRelativeTime(item.createdAt, now)}</span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "96px",
      align: "right",
      cell: (item) => (
        <Link
          href={`/admin/links/${item.code}`}
          aria-label={`Ver ${item.code}`}
          className="font-mono text-data-m tracking-[0.1em] text-sage-dim transition-colors hover:text-bone"
        >
          ···
        </Link>
      ),
    },
  ];

  return (
    <>
      {/* S15 / screen 04: the sidebar marks the active page from `lg` up, so
          the bar keeps its title only while the sidebar is off-canvas. */}
      <PageHeader
        title="Panel"
        titleSize="m"
        titleMode="mobile-only"
        subtitle="Hoy"
        actions={
          <>
            <form
              action="/admin/links"
              className="hidden items-center gap-3 md:flex"
            >
              <Input
                name="q"
                size="sm"
                placeholder="Buscar código o URL"
                aria-label="Buscar código o URL"
                spellCheck={false}
                className="w-60"
              />
            </form>
            <Link
              href="/"
              className={buttonClassName("primary", "sm", "md:h-10 md:px-4")}
            >
              + Nuevo link
            </Link>
          </>
        }
      />

      <PageContent>
        <section className="rise rise-1 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Clics hoy"
            value={formatNumber(clicksToday)}
            delta={formatDelta(delta)}
            tone={delta > 0 ? "lime" : delta < 0 ? "rust" : "muted"}
          />
          <Stat label="Links activos" value={formatNumber(active.total)} />
          <Stat
            label="Último clic"
            value={
              lastClickAt ? formatCompactRelativeTime(lastClickAt, now) : "—"
            }
          />
          <Stat label="Creados hoy" value={formatNumber(createdToday)} />
        </section>

        {all.total === 0 ? (
          <Card className="rise rise-2">
            <EmptyState
              title="Todavía no hay links"
              description="Cuando acortes el primero vas a ver acá los clics de hoy, la actividad reciente y el top del día."
              action={
                <Link href="/" className={buttonClassName("secondary")}>
                  Crear el primero
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <div className="rise rise-2 grid gap-6 lg:grid-cols-[1fr_300px]">
              <Card className="flex flex-col gap-4">
                <CardTitle>Actividad reciente</CardTitle>
                {recent.length === 0 ? (
                  <p className="text-small text-sage-dim">
                    Todavía no hay clics registrados.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {recent.map((entry) => (
                      <div
                        key={`${entry.row.item.code}-${entry.lastClick}`}
                        className="grid h-11 grid-cols-[72px_110px_1fr] items-center border-b border-line last:border-b-0"
                      >
                        <span className="font-mono text-data-s tabular-nums text-sage-dim">
                          {localDateKey(new Date(entry.lastClick), timeZone) ===
                          todayKey
                            ? formatTimeOfDay(entry.lastClick, timeZone)
                            : formatDayMonth(
                                localDateKey(new Date(entry.lastClick), timeZone),
                              )}
                        </span>
                        <Link
                          href={`/admin/links/${entry.row.item.code}`}
                          className="font-mono text-data-m text-lime"
                        >
                          {entry.row.item.code}
                        </Link>
                        <span className="truncate pr-3 text-small text-sage">
                          {entry.row.item.targetUrl.replace(/^https?:\/\//, "")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="flex flex-col gap-4 self-start">
                <CardLabel>Top de hoy</CardLabel>
                {topToday.length === 0 ? (
                  <p className="text-small text-sage-dim">Sin clics hoy.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {topToday.map((entry) => (
                      <div
                        key={entry.code}
                        className="relative flex items-center justify-between rounded-md border border-line bg-raised px-3 py-3"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-sm bg-lime"
                        />
                        <Link
                          href={`/admin/links/${entry.code}`}
                          className="ml-1.5 font-mono text-data-m text-lime"
                        >
                          {entry.code}
                        </Link>
                        <span className="font-mono text-data-m tabular-nums text-bone">
                          {formatNumber(entry.clicks)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card flush className="rise rise-3">
              <DataTable
                columns={tableColumns}
                rows={all.items.slice(0, 5)}
                rowKey={(item) => item.code}
              />
            </Card>
          </>
        )}
      </PageContent>
    </>
  );
}
