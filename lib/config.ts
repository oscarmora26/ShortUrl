/**
 * S10: every runtime setting comes from the environment. Nothing is read from
 * the filesystem and no value is persisted, so the process boots from env vars
 * plus Postgres only.
 */

export const DEFAULT_BASE_URL = "http://localhost:3000";
export const DEFAULT_ANALYTICS_TIME_ZONE = "America/Argentina/Buenos_Aires";

function readEnv(name: string): string | null {
  const value = process.env[name];
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (value === null) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getDatabaseUrl(): string {
  return requireEnv("DATABASE_URL");
}

/** Public origin, without a trailing slash. */
export function getBaseUrl(): string {
  const raw = readEnv("BASE_URL") ?? DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function getAnalyticsTimeZone(): string {
  return readEnv("ANALYTICS_TZ") ?? DEFAULT_ANALYTICS_TIME_ZONE;
}

export function isTrustProxyEnabled(): boolean {
  const raw = readEnv("TRUST_PROXY");
  return raw !== null && /^(1|true|yes|on)$/i.test(raw);
}

export function getAdminPasswordHash(): string | null {
  return readEnv("ADMIN_PASSWORD_HASH");
}

export function getSessionSecret(): string | null {
  return readEnv("SESSION_SECRET");
}

/** S1: `shortUrl` returned by `POST /api/links`. */
export function buildShortUrl(code: string): string {
  return `${getBaseUrl()}/${code}`;
}
