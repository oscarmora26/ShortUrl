import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin-guard";
import { buildShortUrl } from "@/lib/config";
import { getClientIp } from "@/lib/http";
import { createLink, listLinks, parseLinkListQuery } from "@/lib/links";
import { consumeCreationRateLimit, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import {
  isDestinationAllowed,
  SAFE_BROWSING_ERROR,
} from "@/lib/safe-browsing";
import { validateTargetUrl } from "@/lib/url";

// S13: never touched at build time, so `npm run build` needs no database.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INVALID_BODY_ERROR = "request body must be a JSON object with a url field";

/**
 * S1: `POST /api/links` with `{ url }` returns
 * `201 { code, shortUrl, targetUrl, expiresAt }`.
 *
 * S3: the caller's hourly budget is spent before anything is written, so a
 * rejected request leaves no link row behind.
 */
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: INVALID_BODY_ERROR }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: INVALID_BODY_ERROR }, { status: 400 });
  }

  const validation = validateTargetUrl((payload as { url?: unknown }).url);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const rateLimit = await consumeCreationRateLimit(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: RATE_LIMIT_ERROR },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  // S5: only checked when `SAFE_BROWSING_API_KEY` is configured.
  if (!(await isDestinationAllowed(validation.url))) {
    return NextResponse.json(
      { error: SAFE_BROWSING_ERROR },
      { status: 400 },
    );
  }

  const link = await createLink({
    targetUrl: validation.url,
    createdIp: getClientIp(request),
  });

  return NextResponse.json(
    {
      code: link.code,
      shortUrl: buildShortUrl(link.code),
      targetUrl: link.targetUrl,
      expiresAt: link.expiresAt.toISOString(),
    },
    { status: 201 },
  );
}

/**
 * S10: `GET /api/links?q=&status=all|active|disabled&page=1&perPage=20` returns
 * the paginated index. Admin only (S7).
 */
export async function GET(request: Request): Promise<Response> {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized !== null) {
    return unauthorized;
  }

  const parsed = parseLinkListQuery(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const page = await listLinks(parsed.query);

  return NextResponse.json(page, {
    headers: { "Cache-Control": "no-store" },
  });
}
