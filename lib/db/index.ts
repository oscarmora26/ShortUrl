import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabaseUrl } from "@/lib/config";
import * as schema from "@/lib/db/schema";

/**
 * Lazily created singletons. Creating the pool does not open a connection, so
 * importing this module is safe during `next build` (S10).
 */
let pool: Pool | null = null;
let database: NodePgDatabase<typeof schema> | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl(), max: 10 });
  }
  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!database) {
    database = drizzle(getPool(), { schema });
  }
  return database;
}

/** Releases the pool. Used by the test suite teardown. */
export async function closeDb(): Promise<void> {
  const current = pool;
  pool = null;
  database = null;
  if (current) {
    await current.end();
  }
}

export { schema };
