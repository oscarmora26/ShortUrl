import { sql, type SQL } from "drizzle-orm";

import { POST as LOGIN } from "@/app/api/auth/login/route";
import { POST as LOGOUT } from "@/app/api/auth/logout/route";
import { GET } from "@/app/[code]/route";
import { GET as GO_GET, POST as GO_POST } from "@/app/go/[code]/route";
import { POST } from "@/app/api/links/route";
import { getDb } from "@/lib/db";
import { ADMIN_PASSWORD } from "./env";

export const CREATE_LINK_URL = "http://localhost:3000/api/links";

type RouteContext = { params: Promise<{ code: string }> };

function contextFor(code: string): RouteContext {
  return { params: Promise.resolve({ code }) };
}

/** Calls `POST /api/links` the way a client would, with a real `Request`. */
export function postLinkRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return POST(
    new Request(CREATE_LINK_URL, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

/** S3: a request that looks like it came through a reverse proxy. */
export function forwardedFor(...hopAddresses: string[]): Record<string, string> {
  return { "x-forwarded-for": hopAddresses.join(", ") };
}

/** Calls `POST /api/links` with a raw (possibly malformed) body. */
export function postRawBody(body: string): Promise<Response> {
  return POST(
    new Request(CREATE_LINK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
}

/** Calls `GET /:code` the way a browser would. */
export function followCode(code: string): Promise<Response> {
  return GET(new Request(`http://localhost:3000/${code}`), contextFor(code));
}

/** S4: opens the interstitial at `/go/:code`. */
export function followGo(code: string): Promise<Response> {
  return GO_GET(
    new Request(`http://localhost:3000/go/${code}`),
    contextFor(code),
  );
}

/** S4: presses `Continuar` on the interstitial. */
export function continueFromGo(code: string): Promise<Response> {
  return GO_POST(
    new Request(`http://localhost:3000/go/${code}`, { method: "POST" }),
    contextFor(code),
  );
}

export type CreatedLink = {
  code: string;
  shortUrl: string;
  targetUrl: string;
  expiresAt: string;
};

/** Creates a link through the public API and returns its body. */
export async function createLink(targetUrl: string): Promise<CreatedLink> {
  const response = await postLinkRequest({ url: targetUrl });
  if (response.status !== 201) {
    throw new Error(`link creation failed with ${response.status}`);
  }
  return (await response.json()) as CreatedLink;
}

async function scalar(query: SQL): Promise<number> {
  const result = await getDb().execute(query);
  return Number((result.rows[0] as { count: string | number }).count);
}

/** Stored-state assertion helper: counts rows without touching repositories. */
export function countLinks(): Promise<number> {
  return scalar(sql`select count(*)::int as count from "links"`);
}

export function countClicks(): Promise<number> {
  return scalar(sql`select count(*)::int as count from "clicks"`);
}

export function countClicksForCode(code: string): Promise<number> {
  return scalar(
    sql`select count(*)::int as count from "clicks" c join "links" l on l.id = c.link_id where l.code = ${code}`,
  );
}

/** Lets a test set or clear a runtime setting (S13: env vars only). */
export function setEnv(name: string, value: string): void {
  process.env[name] = value;
}

export function clearEnv(name: string): void {
  delete process.env[name];
}

/** S6: `POST /api/auth/login`. */
export function postLogin(body: unknown): Promise<Response> {
  return LOGIN(
    new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/** S6: `POST /api/auth/logout`. */
export function postLogout(cookie?: string): Promise<Response> {
  return LOGOUT(
    new Request("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: cookie ? { cookie } : {},
    }),
  );
}

/** The raw `Set-Cookie` header of a response, or `null` when there is none. */
export function setCookieHeader(response: Response): string | null {
  return response.headers.get("set-cookie");
}

/** The `name=value` pair of the session cookie in a `Set-Cookie` header. */
export function sessionCookiePair(response: Response): string {
  const header = setCookieHeader(response);
  if (header === null) {
    throw new Error("response did not set a cookie");
  }
  return header.split(";")[0]?.trim() ?? "";
}

/** Logs in as the owner and returns the `Cookie` header value. */
export async function loginAsAdmin(
  password: string = ADMIN_PASSWORD,
): Promise<string> {
  const response = await postLogin({ password });
  if (response.status !== 204) {
    throw new Error(`login failed with ${response.status}`);
  }
  return sessionCookiePair(response);
}

/**
 * Fixture setup for S2: the soft-disable endpoint is a later task (T5), so the
 * disabled state is written directly.
 */
export async function disableLink(code: string): Promise<void> {
  await getDb().execute(
    sql`update "links" set disabled_at = now() where code = ${code}`,
  );
}

/**
 * Fixture setup for S8/S9: clicks with an explicit timestamp. No public
 * endpoint creates past-dated clicks, so the timeline is built here.
 */
export async function recordClicksAt(
  code: string,
  instants: Date[],
): Promise<void> {
  for (const instant of instants) {
    await getDb().execute(
      sql`insert into "clicks" ("link_id", "clicked_at") select id, ${instant} from "links" where code = ${code}`,
    );
  }
}

/** S8: 30 consecutive days ending today, ascending, zero filled. */
export function localDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Shifts a `YYYY-MM-DD` date string by whole days. */
export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function expireLink(code: string): Promise<void> {
  await getDb().execute(
    sql`update "links" set created_at = now() - interval '40 days', expires_at = now() - interval '10 days' where code = ${code}`,
  );
}


/** Fixture setup for S10: an explicit creation time, so ordering is testable. */
export async function backdateLink(
  code: string,
  createdAtIso: string,
): Promise<void> {
  await getDb().execute(
    sql`update "links" set created_at = ${new Date(createdAtIso)} where code = ${code}`,
  );
}
