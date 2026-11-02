import { NextResponse } from "next/server";

import { hasClicks, recordClick, resolveLink } from "@/lib/links";

// S13: never touched at build time, so `npm run build` needs no database.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ code: string }> };

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * S2: `GET /:code` redirects with `302` and `Cache-Control: no-store`, recording
 * exactly one click. Unknown codes are `404`, disabled and expired codes are
 * `410`, and none of those record a click.
 *
 * S4: the first visit of an anonymous link never reaches the destination
 * directly; it is handed to `/go/:code`, where the visitor has to confirm.
 */
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { code } = await context.params;
  const resolution = await resolveLink(code);

  if (resolution.status === "not_found") {
    return NextResponse.json(
      { error: "link not found" },
      { status: 404, headers: NO_STORE },
    );
  }

  if (resolution.status !== "ok") {
    return NextResponse.json(
      { error: `link ${resolution.status}` },
      { status: 410, headers: NO_STORE },
    );
  }

  const { link } = resolution;

  if (!(await hasClicks(link.id))) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/go/${encodeURIComponent(code)}`, ...NO_STORE },
    });
  }

  await recordClick(link.id);

  return new Response(null, {
    status: 302,
    headers: { Location: link.targetUrl, ...NO_STORE },
  });
}
