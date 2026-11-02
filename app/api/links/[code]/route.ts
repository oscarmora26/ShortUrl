import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin-guard";
import {
  INVALID_LINK_STATUS_ERROR,
  isLinkStatus,
  setLinkStatus,
} from "@/lib/links";

// S13: never touched at build time, so `npm run build` needs no database.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ code: string }> };

const NO_STORE = { "Cache-Control": "no-store" } as const;
const INVALID_BODY_ERROR = "request body must be a JSON object with a status field";

function notFound(): Response {
  return NextResponse.json(
    { error: "link not found" },
    { status: 404, headers: NO_STORE },
  );
}

/**
 * S11: `PATCH /api/links/:code` with `{ status }` disables or re-enables a link.
 * Admin only (S7). Unknown codes are `404`; an unusable status is `400` and
 * changes nothing.
 */
export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized !== null) {
    return unauthorized;
  }

  const { code } = await context.params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: INVALID_BODY_ERROR },
      { status: 400, headers: NO_STORE },
    );
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json(
      { error: INVALID_BODY_ERROR },
      { status: 400, headers: NO_STORE },
    );
  }

  const status = (payload as { status?: unknown }).status;
  if (!isLinkStatus(status)) {
    return NextResponse.json(
      { error: INVALID_LINK_STATUS_ERROR },
      { status: 400, headers: NO_STORE },
    );
  }

  const updated = await setLinkStatus(code, status);
  if (updated === null) {
    return notFound();
  }

  return NextResponse.json(updated, { headers: NO_STORE });
}

/**
 * S11: `DELETE /api/links/:code` soft-disables the link. Redirects become `410`
 * and the click history is preserved. Admin only (S7).
 */
export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized !== null) {
    return unauthorized;
  }

  const { code } = await context.params;
  const updated = await setLinkStatus(code, "disabled");
  if (updated === null) {
    return notFound();
  }

  return NextResponse.json(updated, { headers: NO_STORE });
}
