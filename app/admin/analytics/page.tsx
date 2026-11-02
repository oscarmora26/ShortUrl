import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardLabel, CardTitle } from "@/components/card";
import { Chart } from "@/components/chart";
import { cn } from "@/components/cn";
import { EmptyState } from "@/components/empty-state";
import { ExportCsvButton } from "@/components/export-csv-button";
import { buttonClassName } from "@/components/button";
import {
  formatDayMonth,
  formatDecimal,
  formatNumber,
  WEEKDAY_ORDER,
  weekdayLong,
  weekdayShort,
} from "@/components/format";
import { PageContent, PageHeader } from "@/components/page-header";
import { requireAdminPage } from "@/lib/admin-guard";
import {
  ANALYTICS_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  getAnalytics,
  parseAnalyticsRange,
  type DayBucket,
} from "@/lib/analytics";

export const metadata: Metadata = { title: "Analíticas · shorturl" };

// S13: no database access during `npm run build`.
export const dynamic = "force-dynamic";

/** Two to four axis labels, always including the first and last day. */
function axisLabelsFor(days: DayBucket[]): string[] {
  const count = days.length;
  if (count === 0) {
    return [];
  }
  if (count <= 7) {
    return [days[0], days[count - 1]].map((day) => formatDayMonth(day.date));
  }

  const indexes = [0, Math.floor((count - 1) / 3), Math.floor(((count - 1) * 2) / 3), count - 1];
  return indexes.map((index) => formatDayMonth(days[index].date));
}

/**
 * S9 / S15 / screen 07 — the trends screen: range selector, series, top links,
 * weekdays, comparison and the CSV export.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();

  const raw = await searchParams;
  const rawRange = Array.isArray(raw.range) ? raw.range[0] : raw.range;
  const range = parseAnalyticsRange(rawRange ?? null) ?? DEFAULT_ANALYTICS_RANGE;
  const analytics = await getAnalytics(range);

  const maxWeekday = Math.max(1, ...analytics.byWeekday);
  // S9's "relative counts": the longest bar of the top links list is full width.
  const maxTopClicks = Math.max(
    1,
    ...analytics.topLinks.map((link) => link.clicks),
  );
  const bestWeekday = analytics.comparison.bestWeekday;
  const hasClicks = analytics.totalClicks > 0;

  const csvRows: string[][] = [
    ["fecha", "clics"],
    ...analytics.days.map((day) => [day.date, String(day.count)]),
  ];

  return (
    <>
      <PageHeader
        title="Analíticas"
        subtitle={`Todos los links · últimos ${range} días`}
      />

      <PageContent>
        <div className="rise rise-1 flex items-center justify-between gap-4">
          <div
            role="group"
            aria-label="Rango de tiempo"
            className="inline-flex items-center gap-0.5 rounded-md border border-line bg-surface p-0.5"
          >
            {ANALYTICS_RANGES.map((value) => {
              const current = value === range;
              return (
                <Link
                  key={value}
                  href={`/admin/analytics?range=${value}`}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "relative inline-flex h-8 items-center justify-center rounded-sm px-4 text-small font-medium transition-colors",
                    current
                      ? "bg-raised text-bone after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-t-sm after:bg-lime"
                      : "text-sage hover:text-bone",
                  )}
                >
                  {value} d
                </Link>
              );
            })}
          </div>

          <ExportCsvButton
            filename={`analytics-${range}d.csv`}
            rows={csvRows}
          />
        </div>

        <Card className="rise rise-2 flex flex-col gap-6">
          <div className="flex flex-col">
            <CardLabel>Clics totales</CardLabel>
            <span className="mt-1.5 font-mono text-data-l font-medium tabular-nums text-bone">
              {formatNumber(analytics.totalClicks)}
            </span>
          </div>
          <Chart
            points={analytics.days}
            axisLabels={axisLabelsFor(analytics.days)}
            height={160}
            label={`Clics por día de los últimos ${range} días`}
          />
        </Card>

        {hasClicks ? (
          <>
            <div className="rise rise-3 grid gap-6 lg:grid-cols-2">
              <Card className="flex flex-col gap-5">
                <CardTitle>Top links</CardTitle>
                <div className="flex flex-col">
                  {analytics.topLinks.map((link, index) => (
                    <div
                      key={link.code}
                      className="grid h-11 grid-cols-[20px_84px_1fr_100px_54px] items-center gap-3 border-b border-line last:border-b-0"
                    >
                      <span className="font-mono text-data-s text-sage-dim">
                        {index + 1}
                      </span>
                      <Link
                        href={`/admin/links/${link.code}`}
                        className="font-mono text-data-m text-lime"
                      >
                        {link.code}
                      </Link>
                      <span
                        className="truncate text-small text-sage"
                        title={link.targetUrl}
                      >
                        {link.targetUrl.replace(/^https?:\/\//, "")}
                      </span>
                      <span className="flex h-1.5 w-full items-center">
                        <span
                          className="h-1.5 rounded-[2px] bg-lime"
                          style={{
                            width: `${Math.max(2, Math.round((link.clicks / maxTopClicks) * 100))}%`,
                          }}
                        />
                      </span>
                      <span className="text-right font-mono text-data-m tabular-nums text-bone">
                        {formatNumber(link.clicks)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="flex flex-col gap-5">
                <CardTitle>Días de la semana</CardTitle>
                <div>
                  <div
                    className="flex items-end justify-around border-b border-line pb-0.5 pt-4"
                    style={{ height: 220 }}
                  >
                    {WEEKDAY_ORDER.map((dow) => {
                      const count = analytics.byWeekday[dow] ?? 0;
                      const weekend = dow === 6 || dow === 0;
                      return (
                        <div
                          key={dow}
                          className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                        >
                          <span className="font-mono text-data-s tabular-nums text-sage">
                            {formatNumber(count)}
                          </span>
                          <span
                            className={cn(
                              "w-6",
                              count === 0
                                ? "h-0.5 rounded-none bg-line"
                                : cn(
                                    "rounded-t-[2px] bg-lime",
                                    weekend && "opacity-[0.65]",
                                  ),
                            )}
                            style={
                              count === 0
                                ? undefined
                                : {
                                    height: Math.max(
                                      4,
                                      Math.round((count / maxWeekday) * 140),
                                    ),
                                  }
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-around pt-2">
                    {WEEKDAY_ORDER.map((dow) => (
                      <span
                        key={dow}
                        className="flex-1 text-center font-mono text-data-s text-sage-dim"
                      >
                        {weekdayShort(dow)}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <Card className="rise rise-4 flex flex-col gap-4">
              <CardTitle>Comparativa</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <div className="flex flex-col px-0 sm:pr-6">
                  <CardLabel>Mejor día de la semana</CardLabel>
                  <span className="mt-3 font-mono text-data-l font-medium text-bone">
                    {bestWeekday === null ? "—" : weekdayLong(bestWeekday)}
                  </span>
                </div>
                <div className="flex flex-col border-line px-0 sm:border-l sm:px-6">
                  <CardLabel>Clics por link (promedio)</CardLabel>
                  <span className="mt-3 font-mono text-data-l font-medium tabular-nums text-bone">
                    {formatDecimal(analytics.comparison.averageClicksPerLink)}
                  </span>
                </div>
                <div className="flex flex-col border-line px-0 sm:border-l sm:px-6">
                  <CardLabel>Links con cero clics</CardLabel>
                  <span className="mt-3 font-mono text-data-l font-medium tabular-nums text-bone">
                    {formatNumber(analytics.comparison.linksWithZeroClicks)}
                  </span>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="rise rise-3">
            <EmptyState
              title="Todavía no hay clics en este rango"
              description={`Los últimos ${range} días no registran clics. Probá con un rango más amplio o compartí alguno de tus links.`}
              action={
                range === 90 ? (
                  <Link href="/admin/links" className={buttonClassName("secondary")}>
                    Ver links
                  </Link>
                ) : (
                  <Link
                    href="/admin/analytics?range=90"
                    className={buttonClassName("secondary")}
                  >
                    Ver 90 días
                  </Link>
                )
              }
            />
          </Card>
        )}
      </PageContent>
    </>
  );
}
