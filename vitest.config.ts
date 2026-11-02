import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { TEST_ENV } from "./tests/env.ts";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // One shared Postgres database: files must not run concurrently.
    fileParallelism: false,
    env: TEST_ENV,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
