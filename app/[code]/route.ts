import { NextResponse } from "next/server";

import { findLinkByCode, recordClick } from "@/lib/links";

// S10: never touched at build time, so `npm run build` needs no database.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ code: string }> };

/**
 * S2: `GET /:code` redirects with `302` and `Cache-Control: no-store`, recording
 * exactly one click. Unknown codes are `404`, disabled codes are `410`, and
 * neither records a click.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { code } = await context.params;
  const link = await findLinkByCode(code);

  if (!link) {
    return NextResponse.json(
      { error: "link not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (link.disabledAt !== null) {
    return NextResponse.json(
      { error: "link disabled" },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }

  await recordClick(link.id);

  return new Response(null, {
    status: 302,
    headers: {
      Location: link.targetUrl,
      "Cache-Control": "no-store",
    },
  });
}
