import { eq } from "drizzle-orm";

import { generateCode } from "@/lib/code";
import { getDb } from "@/lib/db";
import { clicks, links, type LinkRow } from "@/lib/db/schema";

const UNIQUE_VIOLATION = "23505";
const MAX_CODE_ATTEMPTS = 5;

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
 * rejects the code as already taken.
 */
export async function createLink(input: CreateLinkInput): Promise<LinkRow> {
  const db = getDb();
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateCode();
    try {
      const [row] = await db
        .insert(links)
        .values({
          code,
          targetUrl: input.targetUrl,
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
