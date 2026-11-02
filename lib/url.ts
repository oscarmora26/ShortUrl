/**
 * S1: only absolute `http`/`https` URLs are accepted, and the stored target may
 * not exceed 2048 characters.
 */
export const MAX_TARGET_URL_LENGTH = 2048;

export const INVALID_URL_ERROR = "url must be an absolute http or https URL";
export const URL_TOO_LONG_ERROR = `url must be at most ${MAX_TARGET_URL_LENGTH} characters`;

export type UrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function validateTargetUrl(input: unknown): UrlValidationResult {
  if (typeof input !== "string" || input.trim() === "") {
    return { ok: false, error: INVALID_URL_ERROR };
  }

  if (input.length > MAX_TARGET_URL_LENGTH) {
    return { ok: false, error: URL_TOO_LONG_ERROR };
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: INVALID_URL_ERROR };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: INVALID_URL_ERROR };
  }

  if (parsed.hostname === "") {
    return { ok: false, error: INVALID_URL_ERROR };
  }

  return { ok: true, url: input };
}
