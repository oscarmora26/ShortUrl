import { NextResponse } from "next/server";

import { createClearedSessionCookie, getAdminSession } from "@/lib/auth";
import { UNAUTHORIZED_ERROR } from "@/lib/admin-guard";

// S13: no database access during `npm run build`.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * S6/S7: `POST /api/auth/logout` is an owner endpoint. With a valid session it
 * answers `204` and clears the cookie; without one it is `401` like every other
 * admin endpoint.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await getAdminSession(request);
  if (session === null) {
    return NextResponse.json({ error: UNAUTHORIZED_ERROR }, { status: 401 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": createClearedSessionCookie(),
      "Cache-Control": "no-store",
    },
  });
}
