import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardLabel, CardTitle } from "@/components/card";
import { Chart } from "@/components/chart";
import {
  formatDayMonth,
  formatDecimal,
  formatDelta,
  formatLongDay,
  formatNumber,
  formatRelativeTime,
  formatRelativeTimeLong,
  formatShortDay,
  localDateKey,
} from "@/components/format";
import { LinkActions } from "@/components/link-actions";
import { PageContent } from "@/components/page-header";
import { Stat } from "@/components/stat";
import { requireAdminPage } from "@/lib/admin-guard";
import { getLinkStats } from "@/lib/analytics";
import { buildShortUrl, getAnalyticsTimeZone } from "@/lib/config";
import { findLinkByCode } from "@/lib/links";

export const metadata: Metadata = { title: "Detalle del link · shorturl" };

// S13: no database access during `npm run build`.
export const dynamic = "force-dynamic";

/**
 * Screen 06 — one link. The only place besides analytics where the 30-day
 * series is allowed to appear (S15).
 */
export default async function LinkDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireAdminPage();

  const { code } = await params;
  const link = await findLinkByCode(code);
  const stats = await getLinkStats(code);
  if (link === null || stats === null) {
    notFound();
  }

  const timeZone = getAnalyticsTimeZone();
  const now = Date.now();
  const disabled = link.disabledAt !== null;
  const days = stats.days;
  const todayCount = days.at(-1)?.count ?? 0;
  const yesterdayCount = days.at(-2)?.count ?? 0;
  const delta = todayCount - yesterdayCount;

  const axisLabels = [
    days[0] ? formatDayMonth(days[0].date) : "",
    days[Math.floor(days.length / 2)]
      ? formatDayMonth(days[Math.floor(days.length / 2)].date)
      : "",
    days.at(-1) ? formatDayMonth(days.at(-1)!.date) : "",
  ];

  return (
    <>
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-6 border-b border-line bg-canvas px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/admin/links"
            aria-label="Volver a links"
            className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong text-bone transition-colors hover:bg-raised"
          >
            ←
          </Link>
          <span className="font-mono text-data-m font-medium text-bone">
            {stats.code}
          </span>
          <span className="truncate font-mono text-data-s tabular-nums text-sage-dim">
            302 · no-store · creado{" "}
            {formatRelativeTimeLong(link.createdAt.toISOString(), now)}
            {disabled ? " · deshabilitado" : ""}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <LinkActions
            code={stats.code}
            shortUrl={buildShortUrl(stats.code)}
            disabled={disabled}
          />
        </div>
      </header>

      <PageContent>
        <Card className="rise rise-1 flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <CardLabel>Destino</CardLabel>
            <span className="break-all font-mono text-data-m tabular-nums text-bone">
              {stats.targetUrl}
            </span>
          </div>
          <a
            href={stats.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md px-3 py-1.5 text-small font-medium text-bone transition-colors hover:bg-raised"
          >
            Abrir ↗
          </a>
        </Card>

        <section className="rise rise-2 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Stat label="Clics totales" value={formatNumber(stats.totalClicks)} />
          <Stat
            label="Clics hoy"
            value={formatNumber(stats.clicksToday)}
            delta={formatDelta(delta)}
            tone={delta > 0 ? "lime" : delta < 0 ? "rust" : "muted"}
          />
          <Stat
            label="Mejor día"
            value={stats.bestDay ? formatNumber(stats.bestDay.count) : "—"}
            delta={
              stats.bestDay
                ? formatLongDay(stats.bestDay.date)
                : "sin clics en 30 días"
            }
          />
        </section>

        <div className="rise rise-3 grid items-stretch gap-6 lg:grid-cols-[1fr_300px]">
          <Card className="flex flex-col justify-between gap-6">
            <div className="flex items-center justify-between">
              <CardTitle>Clics por día</CardTitle>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 rounded-sm bg-lime" />
                <span className="text-micro font-medium text-sage-dim">
                  Clics
                </span>
              </div>
            </div>
            <Chart
              points={days}
              axisLabels={axisLabels}
              barWidth="thin"
              height={180}
              label="Clics por día de los últimos 30 días"
            />
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-2">
              <CardLabel>Top días</CardLabel>
              {stats.topDays.length === 0 ? (
                <p className="text-small text-sage-dim">Sin clics en 30 días.</p>
              ) : (
                <div className="flex flex-col">
                  {stats.topDays.map((day) => (
                    <div
                      key={day.date}
                      className="flex h-10 items-center justify-between border-b border-line last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-3 w-0.5 rounded-sm bg-lime"
                        />
                        <span className="text-small text-sage">
                          {formatShortDay(day.date)}
                        </span>
                      </div>
                      <span className="font-mono text-data-m tabular-nums text-bone">
                        {formatNumber(day.count)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="flex flex-col gap-2">
              <CardLabel>Actividad</CardLabel>
              <div className="flex flex-col">
                <div className="flex h-10 items-center justify-between border-b border-line">
                  <span className="text-small text-sage-dim">Primer clic</span>
                  <span className="font-mono text-data-s tabular-nums text-bone">
                    {stats.activity.firstClick
                      ? formatDayMonth(
                          localDateKey(
                            new Date(stats.activity.firstClick),
                            timeZone,
                          ),
                        )
                      : "—"}
                  </span>
                </div>
                <div className="flex h-10 items-center justify-between border-b border-line">
                  <span className="text-small text-sage-dim">Último clic</span>
                  <span className="font-mono text-data-s tabular-nums text-bone">
                    {stats.activity.lastClick
                      ? formatRelativeTime(stats.activity.lastClick, now)
                      : "—"}
                  </span>
                </div>
                <div className="flex h-10 items-center justify-between">
                  <span className="text-small text-sage-dim">Promedio</span>
                  <span className="font-mono text-data-s tabular-nums text-bone">
                    {formatDecimal(stats.activity.averagePerDay)} /día
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <p className="text-small text-sage-dim">
          Zona horaria de los cortes: {timeZone.replaceAll("_", " ")} · el link
          expira{" "}
          {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
            link.expiresAt,
          )}
          .
        </p>
      </PageContent>
    </>
  );
}
