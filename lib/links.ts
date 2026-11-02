import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { generateCode } from "@/lib/code";
import { getDb } from "@/lib/db";
import { clicks, links, type LinkRow } from "@/lib/db/schema";

const UNIQUE_VIOLATION = "23505";
const MAX_CODE_ATTEMPTS = 5;

/** S4: anonymous links live 30 days. */
export const ANONYMOUS_LINK_TTL_DAYS = 30;
export const ANONYMOUS_LINK_TTL_MS =
  ANONYMOUS_LINK_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * `pg` reports a duplicate key with SQLSTATE 23505. Drizzle wraps driver errors,
 * so the code is looked up through the `cause` chain.
 */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth += 1) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export type CreateLinkInput = {
  targetUrl: string;
  createdIp?: string | null;
};

/**
 * S1: inserts a link with a freshly generated code, retrying when the database
 * rejects the code as already taken. S4: the link expires 30 days from now.
 */
export async function createLink(input: CreateLinkInput): Promise<LinkRow> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + ANONYMOUS_LINK_TTL_MS);
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateCode();
    try {
      const [row] = await db
        .insert(links)
        .values({
          code,
          targetUrl: input.targetUrl,
          expiresAt,
          createdIp: input.createdIp ?? null,
        })
        .returning();

      return row;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw new Error(
    `Could not allocate a unique code after ${MAX_CODE_ATTEMPTS} attempts`,
    { cause: lastError },
  );
}

export async function findLinkByCode(code: string): Promise<LinkRow | null> {
  const [row] = await getDb()
    .select()
    .from(links)
    .where(eq(links.code, code))
    .limit(1);

  return row ?? null;
}

/** S2: records exactly one click for a resolved, enabled link. */
export async function recordClick(linkId: number): Promise<void> {
  await getDb().insert(clicks).values({ linkId });
}

/**
 * S4: the interstitial is shown while a link is anonymous and has never been
 * clicked, so a visitor cannot be sent straight to an unvetted destination.
 */
export async function hasClicks(linkId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: clicks.id })
    .from(clicks)
    .where(eq(clicks.linkId, linkId))
    .limit(1);

  return row !== undefined;
}

/** S4: expired links answer `410` and never record a click. */
export function isLinkExpired(link: LinkRow, now: Date = new Date()): boolean {
  return link.expiresAt.getTime() <= now.getTime();
}

/**
 * S2/S4: resolves a public code for `/:code` and `/go/:code`.
 *
 * The precedence lives here once so both entry points answer the same status
 * for the same link: unknown is `not_found`, a soft-disabled link stays `410`,
 * and an expired link is `410` as well.
 */
export type LinkResolution =
  | { status: "ok"; link: LinkRow }
  | { status: "not_found" }
  | { status: "disabled" }
  | { status: "expired" };

export async function resolveLink(code: string): Promise<LinkResolution> {
  const link = await findLinkByCode(code);
  if (!link) {
    return { status: "not_found" };
  }
  if (link.disabledAt !== null) {
    return { status: "disabled" };
  }
  if (isLinkExpired(link)) {
    return { status: "expired" };
  }
  return { status: "ok", link };
}

/** S10: `GET /api/links` pagination contract. */
export const LINK_LIST_STATUSES = ["all", "active", "disabled"] as const;
export type LinkListStatus = (typeof LINK_LIST_STATUSES)[number];

export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export const INVALID_STATUS_ERROR =
  "status must be one of all, active or disabled";
export const INVALID_PAGE_ERROR = "page must be a positive integer";
export const INVALID_PER_PAGE_ERROR = `perPage must be an integer between 1 and ${MAX_PER_PAGE}`;

export type LinkListQuery = {
  q: string;
  status: LinkListStatus;
  page: number;
  perPage: number;
};

export type LinkListItem = {
  code: string;
  targetUrl: string;
  clicks: number;
  createdAt: string;
  status: "active" | "disabled";
};

export type LinkListPage = {
  items: LinkListItem[];
  total: number;
  page: number;
  pageCount: number;
};

export type LinkListQueryResult =
  | { ok: true; query: LinkListQuery }
  | { ok: false; error: string };

function readPositiveInteger(
  raw: string | null,
  fallback: number,
  maximum: number,
): number | null {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  if (!/^\d+$/.test(raw.trim())) {
    return null;
  }
  const value = Number(raw.trim());
  return value >= 1 && value <= maximum ? value : null;
}

/** S10: validates the query string, so the handler only deals with numbers. */
export function parseLinkListQuery(
  params: URLSearchParams,
): LinkListQueryResult {
  const status = (params.get("status") ?? "all").trim();
  if (!(LINK_LIST_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: INVALID_STATUS_ERROR };
  }

  const page = readPositiveInteger(params.get("page"), 1, Number.MAX_SAFE_INTEGER);
  if (page === null) {
    return { ok: false, error: INVALID_PAGE_ERROR };
  }

  const perPage = readPositiveInteger(
    params.get("perPage"),
    DEFAULT_PER_PAGE,
    MAX_PER_PAGE,
  );
  if (perPage === null) {
    return { ok: false, error: INVALID_PER_PAGE_ERROR };
  }

  return {
    ok: true,
    query: {
      q: params.get("q") ?? "",
      status: status as LinkListStatus,
      page,
      perPage,
    },
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/** S10: newest first, with the click count of every link. */
export async function listLinks(query: LinkListQuery): Promise<LinkListPage> {
  const db = getDb();
  const conditions: SQL[] = [];
  const search = query.q.trim();

  if (search !== "") {
    const pattern = `%${escapeLikePattern(search)}%`;
    const matches = or(
      ilike(links.code, pattern),
      ilike(links.targetUrl, pattern),
    );
    if (matches !== undefined) {
      conditions.push(matches);
    }
  }

  if (query.status === "active") {
    conditions.push(isNull(links.disabledAt));
  } else if (query.status === "disabled") {
    conditions.push(isNotNull(links.disabledAt));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: links.id,
      code: links.code,
      targetUrl: links.targetUrl,
      createdAt: links.createdAt,
      disabledAt: links.disabledAt,
    })
    .from(links)
    .where(where)
    .orderBy(desc(links.createdAt), asc(links.code))
    .limit(query.perPage)
    .offset((query.page - 1) * query.perPage);

  const countRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(links)
    .where(where);
  const total = Number(countRows[0]?.total ?? 0);

  const ids = rows.map((row) => row.id);
  const clickRows =
    ids.length === 0
      ? []
      : await db
          .select({
            linkId: clicks.linkId,
            clicks: sql<number>`count(*)::int`,
          })
          .from(clicks)
          .where(inArray(clicks.linkId, ids))
          .groupBy(clicks.linkId);
  const clicksByLink = new Map(
    clickRows.map((row) => [row.linkId, Number(row.clicks)]),
  );

  return {
    items: rows.map((row) => ({
      code: row.code,
      targetUrl: row.targetUrl,
      clicks: clicksByLink.get(row.id) ?? 0,
      createdAt: row.createdAt.toISOString(),
      status: row.disabledAt === null ? "active" : "disabled",
    })),
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / query.perPage)),
  };
}

/** S11: the only two states a link can be in from the owner's point of view. */
export const LINK_STATUSES = ["active", "disabled"] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const INVALID_LINK_STATUS_ERROR =
  "status must be active or disabled";

export function isLinkStatus(value: unknown): value is LinkStatus {
  return (
    typeof value === "string" &&
    (LINK_STATUSES as readonly string[]).includes(value)
  );
}

export type LinkStatusChange = { code: string; status: LinkStatus };

/**
 * S11: disabling is a soft delete. `disabled_at` is set instead of deleting the
 * row, so `/api/links/:code/stats` keeps its history and the link can be
 * re-enabled. Unknown codes return `null`.
 */
export async function setLinkStatus(
  code: string,
  status: LinkStatus,
): Promise<LinkStatusChange | null> {
  const [row] = await getDb()
    .update(links)
    .set({ disabledAt: status === "disabled" ? new Date() : null })
    .where(eq(links.code, code))
    .returning({ code: links.code, disabledAt: links.disabledAt });

  if (row === undefined) {
    return null;
  }

  return {
    code: row.code,
    status: row.disabledAt === null ? "active" : "disabled",
  };
}
