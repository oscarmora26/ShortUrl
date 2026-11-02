import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as STATS } from "@/app/api/links/[code]/stats/route";
import { SignJWT } from "jose";
import { SESSION_SECRET, TEST_ENV } from "./env";
import {
  countClicksForCode,
  createLink,
  localDateInTimeZone,
  loginAsAdmin,
  recordClicksAt,
  setEnv,
  shiftDate,
} from "./helpers";

/**
 * S8: per-link stats. 30 consecutive zero-filled days bucketed by
 * `ANALYTICS_TZ`, ascending, plus `topDays` and `activity`.
 */
const TIME_ZONE = TEST_ENV.ANALYTICS_TZ;
const WINDOW_DAYS = 30;

type Day = { date: string; count: number };
type Stats = {
  code: string;
  targetUrl: string;
  totalClicks: number;
  clicksToday: number;
  bestDay: Day | null;
  days: Day[];
  topDays: Day[];
  activity: {
    firstClick: string | null;
    lastClick: string | null;
    averagePerDay: number;
  };
};

function statsRequest(code: string, cookie?: string): Promise<Response> {
  return STATS(
    new Request(`http://localhost:3000/api/links/${code}/stats`, {
      headers: cookie === undefined ? {} : { cookie },
    }),
    { params: Promise.resolve({ code }) },
  );
}

async function readStats(code: string, cookie: string): Promise<Stats> {
  const response = await statsRequest(code, cookie);
  expect(response.status).toBe(200);
  return (await response.json()) as Stats;
}

/** Local midnight of `date` in ART is 03:00 UTC (Argentina has no DST). */
function artInstant(localDate: string, hour: number, minute = 0): Date {
  const utcHour = hour + 3;
  if (utcHour < 24) {
    return new Date(
      `${localDate}T${String(utcHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
    );
  }
  return new Date(
    `${shiftDate(localDate, 1)}T${String(utcHour - 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
  );
}

async function expiredCookie(): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60;
  const token = await new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 60)
    .sign(new TextEncoder().encode(SESSION_SECRET));
  return `shorturl_session=${token}`;
}

let cookie = "";

beforeEach(async () => {
  cookie = await loginAsAdmin();
});

afterEach(() => {
  for (const [name, value] of Object.entries(TEST_ENV)) {
    setEnv(name, value);
  }
});

describe("S8 GET /api/links/:code/stats", () => {
  it("requires an owner session", async () => {
    const link = await createLink("https://example.com/stats-auth");
    await recordClicksAt(link.code, [new Date()]);

    const anonymous = await statsRequest(link.code);
    expect(anonymous.status).toBe(401);
    expect(((await anonymous.json()) as { error: string }).error.length).toBeGreaterThan(0);

    const expired = await statsRequest(link.code, await expiredCookie());
    expect(expired.status).toBe(401);

    expect(await countClicksForCode(link.code)).toBe(1);
  });

  it("returns 404 for an unknown code and records nothing", async () => {
    const response = await statsRequest("zzzzzzz", cookie);

    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: string }).error.length).toBeGreaterThan(0);
  });

  it("returns the documented shape with 30 zero-filled consecutive days", async () => {
    const link = await createLink("https://example.com/stats-shape");

    const stats = await readStats(link.code, cookie);

    expect(Object.keys(stats).sort()).toEqual([
      "activity",
      "bestDay",
      "clicksToday",
      "code",
      "days",
      "targetUrl",
      "topDays",
      "totalClicks",
    ]);
    expect(stats.code).toBe(link.code);
    expect(stats.targetUrl).toBe("https://example.com/stats-shape");
    expect(stats.totalClicks).toBe(0);
    expect(stats.clicksToday).toBe(0);
    expect(stats.bestDay).toBeNull();
    expect(stats.topDays).toEqual([]);
    expect(stats.days).toHaveLength(WINDOW_DAYS);

    const today = localDateInTimeZone(new Date(), TIME_ZONE);
    expect(stats.days.at(-1)).toEqual({ date: today, count: 0 });
    expect(stats.days[0]).toEqual({
      date: shiftDate(today, -(WINDOW_DAYS - 1)),
      count: 0,
    });

    // Consecutive and ascending.
    for (let index = 1; index < stats.days.length; index += 1) {
      expect(stats.days[index]?.date).toBe(
        shiftDate(stats.days[index - 1]?.date ?? "", 1),
      );
    }

    expect(stats.activity).toEqual({
      firstClick: null,
      lastClick: null,
      averagePerDay: 0,
    });
  });

  it("buckets clicks by ANALYTICS_TZ day, not by UTC day", async () => {
    const link = await createLink("https://example.com/stats-bucket");
    const today = localDateInTimeZone(new Date(), TIME_ZONE);
    const yesterday = shiftDate(today, -1);

    // 00:30 local today and 23:00 local yesterday are both "today" in UTC.
    const earlyToday = artInstant(today, 0, 30);
    const lateYesterday = artInstant(yesterday, 23);
    expect(earlyToday.toISOString().slice(0, 10)).toBe(today);
    expect(lateYesterday.toISOString().slice(0, 10)).toBe(today);

    await recordClicksAt(link.code, [earlyToday, lateYesterday, earlyToday]);

    const stats = await readStats(link.code, cookie);
    const byDate = new Map(stats.days.map((day) => [day.date, day.count]));

    expect(byDate.get(today)).toBe(2);
    expect(byDate.get(yesterday)).toBe(1);
    expect(stats.clicksToday).toBe(2);
    expect(stats.totalClicks).toBe(3);
  });

  it("reports bestDay, topDays and activity", async () => {
    const link = await createLink("https://example.com/stats-trends");
    const today = localDateInTimeZone(new Date(), TIME_ZONE);
    const dayOne = shiftDate(today, -3);
    const dayTwo = shiftDate(today, -2);
    const dayThree = shiftDate(today, -1);

    const first = artInstant(dayOne, 10);
    const second = artInstant(dayTwo, 11);
    const third = artInstant(dayThree, 12);
    const fourth = artInstant(dayThree, 13);

    await recordClicksAt(link.code, [
      first,
      second,
      third,
      fourth,
      artInstant(dayThree, 14),
      artInstant(dayThree, 15),
    ]);

    const stats = await readStats(link.code, cookie);

    expect(stats.totalClicks).toBe(6);
    expect(stats.bestDay).toEqual({ date: dayThree, count: 4 });
    expect(stats.topDays).toEqual([
      { date: dayThree, count: 4 },
      { date: dayTwo, count: 1 },
      { date: dayOne, count: 1 },
    ]);
    expect(stats.activity.firstClick).toBe(first.toISOString());
    expect(stats.activity.lastClick).toBe(artInstant(dayThree, 15).toISOString());
    expect(stats.activity.averagePerDay).toBe(0.2);
  });

  it("keeps the previous behaviour of recording no click while reading stats", async () => {
    const link = await createLink("https://example.com/stats-read-only");
    await recordClicksAt(link.code, [artInstant(localDateInTimeZone(new Date(), TIME_ZONE), 9)]);

    await readStats(link.code, cookie);
    await readStats(link.code, cookie);

    expect(await countClicksForCode(link.code)).toBe(1);
  });
});
