import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * S10: the runtime boots from environment variables plus Postgres only — no
 * filesystem writes. Route handlers and libraries must not import `fs`.
 */
const RUNTIME_ROOTS = ["app", "lib"];
const FILESYSTEM_IMPORT =
  /(?:from\s+["'](?:node:)?fs(?:\/promises)?["'])|(?:require\(\s*["'](?:node:)?fs(?:\/promises)?["']\s*\))/;

function collectSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(?:ts|tsx|mts|js|mjs)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("S10 runtime configuration", () => {
  it("keeps the runtime free of filesystem access", () => {
    const offenders = RUNTIME_ROOTS.flatMap(collectSourceFiles).filter((file) =>
      FILESYSTEM_IMPORT.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
