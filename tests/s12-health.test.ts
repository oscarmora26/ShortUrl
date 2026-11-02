import { afterEach, describe, expect, it } from "vitest";

import { GET as HEALTH } from "@/app/api/health/route";
import { TEST_ENV } from "./env";
import { countClicks, countLinks, setEnv } from "./helpers";

/**
 * S12: `GET /api/health` is the liveness probe. No auth, no database writes.
 */
function healthRequest(): Promise<Response> {
  return HEALTH();
}

afterEach(() => {
  for (const [name, value] of Object.entries(TEST_ENV)) {
    setEnv(name, value);
  }
});

describe("S12 GET /api/health", () => {
  it("answers 200 { ok: true } without a session", async () => {
    const response = await healthRequest();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("writes nothing and touches no database", async () => {
    // An unreachable database URL proves the handler does not connect at all.
    setEnv("DATABASE_URL", "postgres://nobody:nobody@127.0.0.1:1/nothing");

    const response = await healthRequest();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await countLinks()).toBe(0);
    expect(await countClicks()).toBe(0);
  });

  it("stays stable when called twice", async () => {
    expect((await healthRequest()).status).toBe(200);
    expect((await healthRequest()).status).toBe(200);
  });
});
