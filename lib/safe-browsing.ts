import { getSafeBrowsingApiKey } from "@/lib/config";

/**
 * S5: optional Google Safe Browsing check on the destination.
 *
 * The app must boot and shorten links without the key, so this module is a
 * best-effort guard: a missing key skips the call, and any upstream problem
 * fails open rather than turning creation into a 5xx.
 */
export const SAFE_BROWSING_ERROR = "url is flagged as unsafe";

const ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const REQUEST_TIMEOUT_MS = 4000;

const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
];

export function isSafeBrowsingEnabled(): boolean {
  return getSafeBrowsingApiKey() !== null;
}

type ThreatMatchesResponse = { matches?: unknown[] };

async function requestThreatMatches(url: string, apiKey: string): Promise<boolean> {
  const response = await fetch(
    `${ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "shorturl2", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: THREAT_TYPES,
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`Safe Browsing answered ${response.status}`);
  }

  const payload = (await response.json()) as ThreatMatchesResponse;
  return Array.isArray(payload.matches) && payload.matches.length > 0;
}

/**
 * S5: `true` when the destination may be stored. Always `true` when no API key
 * is configured or the service cannot be reached.
 */
export async function isDestinationAllowed(url: string): Promise<boolean> {
  const apiKey = getSafeBrowsingApiKey();
  if (apiKey === null) {
    return true;
  }

  try {
    return !(await requestThreatMatches(url, apiKey));
  } catch {
    // Fail open: an unavailable third party must never break link creation.
    return true;
  }
}
