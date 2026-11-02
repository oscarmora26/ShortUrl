import { NextResponse } from "next/server";

// S12/S13: a liveness probe that must never reach the database and must be
// callable while the app boots, so the build never depends on it.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * S12: `GET /api/health` → `200 { ok: true }`. Public, no auth, no writes.
 */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
