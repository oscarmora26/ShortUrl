import { NextResponse } from "next/server";

import {
  createSessionCookie,
  createSessionToken,
  INVALID_CREDENTIALS_ERROR,
  SESSION_UNAVAILABLE_ERROR,
  verifyAdminPassword,
} from "@/lib/auth";

// S13: no database access during `npm run build`.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INVALID_BODY_ERROR = "request body must be a JSON object with a password field";

/**
 * S6: `POST /api/auth/login` with the owner password answers `204` and sets the
 * session cookie. A wrong password is `401` and never says which half of the
 * credentials was wrong, because there is only one half.
 */
export async function POST(request: Request): Promise<Response> {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: INVALID_BODY_ERROR }, { status: 400 });
  }

  const password =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as { password?: unknown }).password
      : undefined;

  if (!(await verifyAdminPassword(password))) {
    return NextResponse.json(
      { error: INVALID_CREDENTIALS_ERROR },
      { status: 401 },
    );
  }

  const token = await createSessionToken();
  if (token === null) {
    return NextResponse.json(
      { error: SESSION_UNAVAILABLE_ERROR },
      { status: 500 },
    );
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": createSessionCookie(token),
      "Cache-Control": "no-store",
    },
  });
}
