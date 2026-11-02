import { isIP } from "node:net";

import { isTrustProxyEnabled } from "@/lib/config";

/**
 * Client IP used for the `links.created_ip` column. `X-Forwarded-For` is only
 * trusted when `TRUST_PROXY` is enabled, otherwise it is spoofable.
 */
export function getClientIp(request: Request): string | null {
  if (!isTrustProxyEnabled()) {
    return null;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const candidate = (
    forwardedFor?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    ""
  ).trim();

  return isIP(candidate) === 0 ? null : candidate;
}
