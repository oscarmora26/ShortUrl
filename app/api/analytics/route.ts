import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin-guard";
import { getAnalytics, parseAnalyticsRange } from "@/lib/analytics";

// S13: never touched at build time, so `npm run build` needs no database.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const INVALID_RANGE_ERROR = "range must be one of 7, 30 or 90";

/**
 * S9: `GET /api/analytics?range=7|30|90` → aggregate for every link. Admin only
 * (S7). Reading never records a click.
 */
export async function GET(request: Request): Promise<Response> {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized !== null) {
    return unauthorized;
  }

  const url = new URL(request.url);
  const range = parseAnalyticsRange(url.searchParams.get("range"));
  if (range === null) {
    return NextResponse.json(
      { error: INVALID_RANGE_ERROR },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const analytics = await getAnalytics(range);

  return NextResponse.json(analytics, {
    headers: { "Cache-Control": "no-store" },
  });
}
