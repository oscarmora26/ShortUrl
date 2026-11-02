import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin-guard";
import { getLinkStats } from "@/lib/analytics";

// S13: never touched at build time, so `npm run build` needs no database.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ code: string }> };

/**
 * S8: `GET /api/links/:code/stats` → 30 zero-filled days bucketed by
 * `ANALYTICS_TZ`, plus `topDays` and `activity`. Admin only (S7).
 */
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized !== null) {
    return unauthorized;
  }

  const { code } = await context.params;
  const stats = await getLinkStats(code);

  if (stats === null) {
    return NextResponse.json(
      { error: "link not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
