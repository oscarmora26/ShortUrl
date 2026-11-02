/**
 * Test database configuration. The suite runs against a real Postgres server:
 * the `shorturl_test` database in the same compose service.
 */
const DEFAULT_TEST_DATABASE_URL =
  "postgres://postgres:postgres@localhost:5432/shorturl_test";

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

/** Runtime configuration injected into the workers (S10: env vars only). */
export const TEST_ENV = {
  DATABASE_URL: TEST_DATABASE_URL,
  BASE_URL,
  ANALYTICS_TZ: "America/Argentina/Buenos_Aires",
  TRUST_PROXY: "false",
  ADMIN_PASSWORD_HASH: "",
  SESSION_SECRET: "test-session-secret-not-a-real-secret",
};
