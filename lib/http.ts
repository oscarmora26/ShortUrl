import { isIP } from "node:net";

import { isTrustProxyEnabled } from "@/lib/config";

/**
 * S3: client IP used for the rate limit bucket and for `links.created_ip`.
 *
 * `X-Forwarded-For` is only trusted when `TRUST_PROXY` is enabled, because the
 * header is client-controlled otherwise. When it is trusted, only the last
 * entry is used: that is the address appended by the proxy closest to us, so a
 * caller cannot pick a fresh identity by prepending hops.
 */
export function getClientIp(request: Request): string | null {
  if (!isTrustProxyEnabled()) {
    return null;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const hops = (forwardedFor ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop !== "");
  const candidate = (hops.at(-1) ?? request.headers.get("x-real-ip") ?? "").trim();

  return isIP(candidate) === 0 ? null : candidate;
}
