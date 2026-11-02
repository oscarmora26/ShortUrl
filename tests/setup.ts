import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";

import { closeDb, getDb } from "@/lib/db";

import { TEST_ENV } from "./env";

// The handlers read configuration from the environment, never from files.
for (const [name, value] of Object.entries(TEST_ENV)) {
  process.env[name] = value;
}

beforeEach(async () => {
  await getDb().execute(
    sql`truncate table "clicks", "links" restart identity cascade`,
  );
});

afterAll(async () => {
  await closeDb();
});
