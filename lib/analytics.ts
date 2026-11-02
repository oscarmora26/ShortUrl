import { sql } from "drizzle-orm";

import { getAnalyticsTimeZone } from "@/lib/config";
import { getDb } from "@/lib/db";
import { findLinkByCode } from "@/lib/links";

/**
 * S8/S9: analytics are bucketed by calendar day in `ANALYTICS_TZ`, never by the
 * server's local day or by UTC. The conversions below are the only place that
 * knows about that: Postgres does the bucketing, these helpers produce the
 * date window the series is zero-filled from.
 */
export const STATS_WINDOW_DAYS = 30;
export const TOP_DAYS = 3;
export const ANALYTICS_RANGES = [7, 30, 90] as const;
export const DEFAULT_ANALYTICS_RANGE = 30;
export const TOP_LINKS = 5;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export type DayBucket = { date: string; count: number };

/** `YYYY-MM-DD` of an instant in the given time zone. */
export function localDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Shifts a `YYYY-MM-DD` string by whole days. */
export function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The last `days` local dates, ascending and including `endDate`. */
export function dateWindow(endDate: string, days: number): string[] {
  const dates: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dates.push(shiftIsoDate(endDate, -offset));
  }
  return dates;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Rounds to two decimals without leaking floating point noise. */
export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function zeroFilled(dates: string[], counts: Map<string, number>): DayBucket[] {
  return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

function busiestDay(days: DayBucket[]): DayBucket | null {
  let best: DayBucket | null = null;
  for (const day of days) {
    if (day.count > 0 && (best === null || day.count > best.count)) {
      best = day;
    }
  }
  return best;
}

function busiestDays(days: DayBucket[], limit: number): DayBucket[] {
  return days
    .filter((day) => day.count > 0)
    .sort((a, b) =>
      a.count === b.count ? b.date.localeCompare(a.date) : b.count - a.count,
    )
    .slice(0, limit);
}

export type LinkActivity = {
  firstClick: string | null;
  lastClick: string | null;
  averagePerDay: number;
};

export type LinkStats = {
  code: string;
  targetUrl: string;
  totalClicks: number;
  clicksToday: number;
  bestDay: DayBucket | null;
  days: DayBucket[];
  topDays: DayBucket[];
  activity: LinkActivity;
};

/** S8: `GET /api/links/:code/stats`. `null` when the code is unknown. */
export async function getLinkStats(code: string): Promise<LinkStats | null> {
  const link = await findLinkByCode(code);
  if (link === null) {
    return null;
  }

  const timeZone = getAnalyticsTimeZone();
  const today = localDateString(new Date(), timeZone);
  const dates = dateWindow(today, STATS_WINDOW_DAYS);
  const since = dates[0] ?? today;

  const series = await getDb().execute(sql`
    select
      (c."clicked_at" at time zone ${timeZone})::date::text as day,
      count(*)::int as count
    from "clicks" c
    where c."link_id" = ${link.id}
      and (c."clicked_at" at time zone ${timeZone})::date >= ${since}::date
    group by 1
    order by 1
  `);

  const counts = new Map<string, number>();
  for (const row of series.rows as { day: string; count: unknown }[]) {
    counts.set(String(row.day), toNumber(row.count));
  }

  const totals = await getDb().execute(sql`
    select
      count(*)::int as total,
      min(c."clicked_at") as first_click,
      max(c."clicked_at") as last_click
    from "clicks" c
    where c."link_id" = ${link.id}
  `);
  const totalRow = totals.rows[0] as
    | { total: unknown; first_click: unknown; last_click: unknown }
    | undefined;

  const days = zeroFilled(dates, counts);
  const windowClicks = days.reduce((sum, day) => sum + day.count, 0);

  return {
    code: link.code,
    targetUrl: link.targetUrl,
    totalClicks: toNumber(totalRow?.total),
    clicksToday: counts.get(today) ?? 0,
    bestDay: busiestDay(days),
    days,
    topDays: busiestDays(days, TOP_DAYS),
    activity: {
      firstClick: toIsoStringOrNull(totalRow?.first_click),
      lastClick: toIsoStringOrNull(totalRow?.last_click),
      averagePerDay: roundToTwo(windowClicks / STATS_WINDOW_DAYS),
    },
  };
}

export type TopLink = {
  code: string;
  targetUrl: string;
  clicks: number;
  share: number;
};

export type AnalyticsComparison = {
  bestWeekday: number | null;
  averageClicksPerLink: number;
  linksWithZeroClicks: number;
};

export type Analytics = {
  range: number;
  totalClicks: number;
  days: DayBucket[];
  topLinks: TopLink[];
  byWeekday: number[];
  comparison: AnalyticsComparison;
};

/** S9: `null` when `range` is not one of 7, 30 or 90. */
export function parseAnalyticsRange(value: string | null): AnalyticsRange | null {
  if (value === null) {
    return DEFAULT_ANALYTICS_RANGE;
  }

  const parsed = Number(value);
  return (ANALYTICS_RANGES as readonly number[]).includes(parsed)
    ? (parsed as AnalyticsRange)
    : null;
}

/**
 * S9: `GET /api/analytics` aggregates every link over the requested range.
 * Weekday index 0 is Sunday (Postgres `dow`), so the series is stable for the
 * UI regardless of server locale.
 */
export async function getAnalytics(range: AnalyticsRange): Promise<Analytics> {
  const timeZone = getAnalyticsTimeZone();
  const db = getDb();
  const today = localDateString(new Date(), timeZone);
  const dates = dateWindow(today, range);
  const since = dates[0] ?? today;

  const series = await db.execute(sql`
    select
      (c."clicked_at" at time zone ${timeZone})::date::text as day,
      count(*)::int as count
    from "clicks" c
    where (c."clicked_at" at time zone ${timeZone})::date >= ${since}::date
    group by 1
    order by 1
  `);

  const counts = new Map<string, number>();
  for (const row of series.rows as { day: string; count: unknown }[]) {
    counts.set(String(row.day), toNumber(row.count));
  }

  const topRows = await db.execute(sql`
    select
      l."code" as code,
      l."target_url" as target_url,
      count(*)::int as clicks
    from "clicks" c
    join "links" l on l."id" = c."link_id"
    where (c."clicked_at" at time zone ${timeZone})::date >= ${since}::date
    group by l."code", l."target_url"
    order by count(*) desc, l."code" asc
    limit ${TOP_LINKS}
  `);

  const weekdayRows = await db.execute(sql`
    select
      extract(dow from (c."clicked_at" at time zone ${timeZone}))::int as dow,
      count(*)::int as count
    from "clicks" c
    where (c."clicked_at" at time zone ${timeZone})::date >= ${since}::date
    group by 1
  `);

  const countRow = await db.execute(sql`
    select
      (select count(*)::int from "links") as links,
      (
        select count(*)::int
        from "links" l
        where not exists (
          select 1 from "clicks" c
          where c."link_id" = l."id"
            and (c."clicked_at" at time zone ${timeZone})::date >= ${since}::date
        )
      ) as links_with_zero_clicks
  `);
  const totals = countRow.rows[0] as
    | { links: unknown; links_with_zero_clicks: unknown }
    | undefined;

  const days = zeroFilled(dates, counts);
  const totalClicks = days.reduce((sum, day) => sum + day.count, 0);
  const linkCount = toNumber(totals?.links);

  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const row of weekdayRows.rows as { dow: unknown; count: unknown }[]) {
    const weekday = toNumber(row.dow);
    if (weekday >= 0 && weekday < byWeekday.length) {
      byWeekday[weekday] = toNumber(row.count);
    }
  }

  const busiestWeekday = byWeekday.reduce(
    (best, count, weekday) =>
      count > 0 && (best === null || count > byWeekday[best]) ? weekday : best,
    null as number | null,
  );

  return {
    range,
    totalClicks,
    days,
    topLinks: (
      topRows.rows as { code: string; target_url: string; clicks: unknown }[]
    ).map((row) => {
      const clicks = toNumber(row.clicks);
      return {
        code: String(row.code),
        targetUrl: String(row.target_url),
        clicks,
        share: totalClicks === 0 ? 0 : roundToTwo(clicks / totalClicks),
      };
    }),
    byWeekday,
    comparison: {
      bestWeekday: busiestWeekday,
      averageClicksPerLink:
        linkCount === 0 ? 0 : roundToTwo(totalClicks / linkCount),
      linksWithZeroClicks: toNumber(totals?.links_with_zero_clicks),
    },
  };
}
