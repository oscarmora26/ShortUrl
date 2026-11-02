import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

import {
  TEST_DATABASE_NAME,
  TEST_DATABASE_URL,
  TEST_MAINTENANCE_DATABASE_URL,
} from "./env";

/**
 * Runs once per suite: ensures the test database exists and applies the
 * committed Drizzle migrations, so tests exercise the same schema the app ships.
 */
export default async function globalSetup(): Promise<void> {
  const admin = new Client({ connectionString: TEST_MAINTENANCE_DATABASE_URL });
  await admin.connect();
  try {
    const existing = await admin.query(
      "select 1 from pg_database where datname = $1",
      [TEST_DATABASE_NAME],
    );
    if (existing.rowCount === 0) {
      await admin.query(`create database "${TEST_DATABASE_NAME}"`);
    }
  } finally {
    await admin.end();
  }

  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  } finally {
    await client.end();
  }
}
