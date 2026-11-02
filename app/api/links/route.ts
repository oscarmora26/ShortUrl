import { NextResponse } from "next/server";

import { buildShortUrl } from "@/lib/config";
import { getClientIp } from "@/lib/http";
import { createLink } from "@/lib/links";
import { validateTargetUrl } from "@/lib/url";

// S10: never touched at build time, so `npm run build` needs no database.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INVALID_BODY_ERROR = "request body must be a JSON object with a url field";

/**
 * S1: `POST /api/links` with `{ url }` returns
 * `201 { code, shortUrl, targetUrl }`.
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

  const link = await createLink({
    targetUrl: validation.url,
    createdIp: getClientIp(request),
  });

  return NextResponse.json(
    {
      code: link.code,
      shortUrl: buildShortUrl(link.code),
      targetUrl: link.targetUrl,
    },
    { status: 201 },
  );
}
