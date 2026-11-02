/**
 * Applies drizzle/*.sql inside the standalone runtime image.
 *
 * Drizzle's own migrator subpath is not part of the traced standalone bundle,
 * so this uses `pg` only — the driver the server already depends on — and
 * keeps its own ledger table. Idempotent: safe to run on every deploy.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("migrate: DATABASE_URL is required");
  process.exit(1);
}

const dir = process.env.MIGRATIONS_DIR ?? "drizzle";
const journal = JSON.parse(readFileSync(join(dir, "meta", "_journal.json"), "utf8"));

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(
    "create table if not exists _migrations (tag text primary key, applied_at timestamptz not null default now())",
  );

  for (const entry of journal.entries) {
    const done = await client.query("select 1 from _migrations where tag = $1", [entry.tag]);
    if (done.rowCount > 0) {
      console.log(`migrate: skip ${entry.tag}`);
      continue;
    }
    const sql = readFileSync(join(dir, `${entry.tag}.sql`), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into _migrations (tag) values ($1)", [entry.tag]);
      await client.query("commit");
      console.log(`migrate: applied ${entry.tag}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
  console.log("migrate: up to date");
} finally {
  await client.end();
}
