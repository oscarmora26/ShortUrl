/**
 * Test database configuration. The suite runs against a real Postgres server:
 * the `shorturl_test` database in the same compose service. `DB_PORT` is the
 * compose-only host port override (not application configuration).
 */
const DATABASE_PORT = process.env.DB_PORT ?? "5435";

const DEFAULT_TEST_DATABASE_URL = `postgres://postgres:postgres@localhost:${DATABASE_PORT}/shorturl_test`;

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;

export function databaseUrlFor(databaseName: string): string {
  const url = new URL(TEST_DATABASE_URL);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export const TEST_DATABASE_NAME = new URL(TEST_DATABASE_URL).pathname.replace(
  /^\//,
  "",
);

/** Maintenance database, used only to create the test database if missing. */
export const TEST_MAINTENANCE_DATABASE_URL = databaseUrlFor("postgres");

export const BASE_URL = "http://localhost:3000";

/** S6: the only accepted owner password, and its bcrypt hash. */
export const ADMIN_PASSWORD = "correct-horse-battery-staple";
export const ADMIN_PASSWORD_HASH =
  "$2b$10$KszSOMI.l5kX4Kr53xFs4OlgikbG044uTDMHeSfU/S3nAWY8dEYV.";

export const SESSION_SECRET = "test-session-secret-not-a-real-secret";

/** Runtime configuration injected into the workers (S13: env vars only). */
export const TEST_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  BASE_URL,
  ANALYTICS_TZ: "America/Argentina/Buenos_Aires",
  TRUST_PROXY: "false",
  ADMIN_PASSWORD_HASH,
  SESSION_SECRET,
};
