import { describe, expect, it, vi } from "vitest";

/**
 * S1 requires the generator to retry on a unique violation. The database is
 * real, so the only way to provoke a collision deterministically is to stub the
 * randomness source and hand out a code that already exists.
 */
const generator = vi.hoisted(() => ({
  sequence: ["aaaaaaa", "aaaaaaa", "bbbbbbb"],
  index: 0,
}));

vi.mock("@/lib/code", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/code")>();
  return {
    ...actual,
    generateCode: () => {
      const code =
        generator.sequence[
          Math.min(generator.index, generator.sequence.length - 1)
        ];
      generator.index += 1;
      return code;
    },
  };
});

import { countLinks, postLinkRequest } from "./helpers";

describe("S1 code uniqueness", () => {
  it("retries with a new code when the database rejects a duplicate", async () => {
    generator.index = 0;

    const first = await postLinkRequest({ url: "https://example.com/first" });
    expect(first.status).toBe(201);
    expect((await first.json()) as { code: string }).toMatchObject({
      code: "aaaaaaa",
    });

    const second = await postLinkRequest({ url: "https://example.com/second" });
    expect(second.status).toBe(201);
    const body = (await second.json()) as { code: string; targetUrl: string };
    expect(body.code).toBe("bbbbbbb");
    expect(body.targetUrl).toBe("https://example.com/second");
    expect(await countLinks()).toBe(2);
  });
});
