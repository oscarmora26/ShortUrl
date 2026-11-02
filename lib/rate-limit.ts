import { sql } from "drizzle-orm";

import { getClientIp } from "@/lib/http";
import { getDb } from "@/lib/db";

/**
 * S3: creation is limited to 20 links per client IP per hour.
 *
 * The counter lives in Postgres and is advanced with a single
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, so two replicas handling a
 * request at the same time cannot both believe the window is unspent, and the
 * count survives a redeploy.
 */
export const RATE_LIMIT_MAX = 20;
export const RATE_LIMIT_WINDOW = "1 hour";

export const RATE_LIMIT_ERROR =
  "too many links created from this address, try again later";

/** One bucket per client IP. Requests without a trusted IP share one bucket. */
export const ANONYMOUS_RATE_LIMIT_BUCKET = "unknown";

export type RateLimitDecision = {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
};

function bucketFor(request: Request): string {
  return getClientIp(request) ?? ANONYMOUS_RATE_LIMIT_BUCKET;
}

/**
 * S3: spends one unit of the caller's hourly budget atomically and reports
 * whether the request may proceed. A rejected request still consumes a unit so
 * a client cannot retry its way past the window.
 */
export async function consumeCreationRateLimit(
  request: Request,
): Promise<RateLimitDecision> {
  const result = await getDb().execute(sql`
    insert into "rate_limits" ("bucket", "window_start", "count")
    values (${bucketFor(request)}, now(), 1)
    on conflict ("bucket") do update set
      "count" = case
        when "rate_limits"."window_start" <= now() - ${RATE_LIMIT_WINDOW}::interval then 1
        else "rate_limits"."count" + 1
      end,
      "window_start" = case
        when "rate_limits"."window_start" <= now() - ${RATE_LIMIT_WINDOW}::interval then now()
        else "rate_limits"."window_start"
      end
    returning
      "count",
      greatest(
        0,
        ceil(extract(epoch from ("window_start" + ${RATE_LIMIT_WINDOW}::interval - now())))
      )::int as "retry_after_seconds"
  `);

  const row = result.rows[0] as
    | { count: number | string; retry_after_seconds: number | string }
    | undefined;
  const count = Number(row?.count ?? RATE_LIMIT_MAX + 1);

  return {
    allowed: count <= RATE_LIMIT_MAX,
    count,
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
  };
}
