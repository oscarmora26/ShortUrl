import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";

import { closeDb, getDb } from "@/lib/db";

import { TEST_ENV } from "./env";

// The handlers read configuration from the environment, never from files.
for (const [name, value] of Object.entries(TEST_ENV)) {
  process.env[name] = value;
}

// S5: the Safe Browsing check must stay off unless a test opts in.
delete process.env.SAFE_BROWSING_API_KEY;

beforeEach(async () => {
  await getDb().execute(
    sql`truncate table "clicks", "links", "rate_limits" restart identity cascade`,
  );
});

afterAll(async () => {
  await closeDb();
});
