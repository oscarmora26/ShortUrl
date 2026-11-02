import { sql, type SQL } from "drizzle-orm";

import { GET } from "@/app/[code]/route";
import { POST } from "@/app/api/links/route";
import { getDb } from "@/lib/db";

export const CREATE_LINK_URL = "http://localhost:3000/api/links";

/** Calls `POST /api/links` the way a client would, with a real `Request`. */
export function postLinkRequest(body: unknown): Promise<Response> {
  return POST(
    new Request(CREATE_LINK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
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
  return GET(new Request(`http://localhost:3000/${code}`), {
    params: Promise.resolve({ code }),
  });
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

/**
 * Fixture setup for S2: the soft-disable endpoint is a later task (T7), so the
 * disabled state is written directly.
 */
export async function disableLink(code: string): Promise<void> {
  await getDb().execute(
    sql`update "links" set disabled_at = now() where code = ${code}`,
  );
}
