import "server-only";
import { headers } from "next/headers";
import { isIP } from "net";

/** Allowlisted header names for proxy client IP extraction when AUTH_TRUST_PROXY="true". */
const ALLOWED_TRUSTED_HEADERS = new Set([
  "x-real-ip",
  "x-forwarded-for",
  "cf-connecting-ip",
  "fastly-client-ip",
  "true-client-ip",
  "x-client-ip",
]);

/** Fallback address returned when client address cannot be determined securely. */
export const FALLBACK_CLIENT_ADDRESS = "unknown-client";

/**
 * Derive a client identifier for login throttling.
 *
 * Security considerations:
 * - Does NOT trust arbitrary forwarding headers by default (prevents IP spoofing).
 * - Only inspects forwarding headers when `AUTH_TRUST_PROXY="true"` is explicitly set.
 * - Restricts header inspection to an explicitly configured allowlisted header name (`AUTH_TRUSTED_IP_HEADER`).
 * - Validates IP format using Node's `net.isIP()`.
 * - Returns `unknown-client` on missing, unconfigured, or malformed inputs.
 * - Never logs or reveals raw IP addresses in public error messages.
 *
 * Production Note: The upstream reverse proxy / ingress controller must be configured to strip
 * untrusted client headers from incoming requests and inject the authenticated connection IP.
 */
export async function getClientAddress(): Promise<string> {
  try {
    const isTrustProxyEnabled = process.env.AUTH_TRUST_PROXY === "true";
    if (!isTrustProxyEnabled) {
      return FALLBACK_CLIENT_ADDRESS;
    }

    const configuredHeader = (
      process.env.AUTH_TRUSTED_IP_HEADER || "x-real-ip"
    )
      .toLowerCase()
      .trim();

    if (!ALLOWED_TRUSTED_HEADERS.has(configuredHeader)) {
      return FALLBACK_CLIENT_ADDRESS;
    }

    const headerStore = await headers();
    const rawHeaderValue = headerStore.get(configuredHeader);
    if (!rawHeaderValue) {
      return FALLBACK_CLIENT_ADDRESS;
    }

    const candidate = rawHeaderValue.trim();
    if (!candidate || candidate.length > 45) {
      return FALLBACK_CLIENT_ADDRESS;
    }

    // Reject comma-separated multi-IP values to prevent spoofing bypasses
    if (candidate.includes(",")) {
      return FALLBACK_CLIENT_ADDRESS;
    }

    if (isIP(candidate) === 0) {
      return FALLBACK_CLIENT_ADDRESS;
    }

    return candidate;
  } catch {
    return FALLBACK_CLIENT_ADDRESS;
  }
}
