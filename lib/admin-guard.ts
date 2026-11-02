import { NextResponse } from "next/server";

import {
  getAdminSession,
  getAdminSessionFromCookieValue,
  SESSION_COOKIE_NAME,
  type AdminSession,
} from "@/lib/auth";

/**
 * S7: one guard for every admin surface.
 *
 * API routes and pages share the same session check; only the failure mode
 * differs. An API answers `401`, a page is redirected to `/login`. The public
 * surface (`POST /api/links`, `/:code`, `/go/:code`) never calls this.
 */
export const UNAUTHORIZED_ERROR = "authentication required";
export const LOGIN_PATH = "/login";

/** S7: `null` when the request may proceed, otherwise the `401` response. */
export async function requireAdminApi(
  request: Request,
): Promise<Response | null> {
  const session = await getAdminSession(request);
  if (session !== null) {
    return null;
  }

  return NextResponse.json(
    { error: UNAUTHORIZED_ERROR },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * S7: the page guard. `/admin/**` pages call this first; without a valid
 * session it redirects to `/login` instead of rendering anything.
 *
 * `next/headers` and `next/navigation` are imported lazily so this module stays
 * importable outside a Next request scope (for example from the route handlers
 * and their tests).
 */
export async function requireAdminPage(): Promise<AdminSession> {
  const { cookies } = await import("next/headers");
  const { redirect } = await import("next/navigation");

  const store = await cookies();
  const session = await getAdminSessionFromCookieValue(
    store.get(SESSION_COOKIE_NAME)?.value ?? null,
  );

  if (session === null) {
    redirect(LOGIN_PATH);
    // `redirect` throws `NEXT_REDIRECT`. The explicit throw keeps the return
    // type honest if it is ever stubbed or returns for any other reason.
    throw new Error("unauthenticated admin page access");
  }

  return session;
}
