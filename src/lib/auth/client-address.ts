import "server-only";
import { headers as nextHeaders } from "next/headers";
import { isIP } from "net";

/** Allowlisted header names for proxy client IP extraction when AUTH_TRUST_PROXY="true". */
export const ALLOWED_TRUSTED_HEADERS = new Set([
  "x-real-ip",
  "x-forwarded-for",
  "cf-connecting-ip",
  "fastly-client-ip",
  "true-client-ip",
  "x-client-ip",
]);

/** Fallback address returned when client address cannot be determined securely. */
export const FALLBACK_CLIENT_ADDRESS = "unknown-client";

export interface ResolveClientAddressParams {
  headerGetter: (name: string) => string | null | undefined;
  trustProxy?: boolean | string;
  trustedHeader?: string;
}

/**
 * Pure function to resolve client address from headers and environment config.
 * Pure and testable without requiring Next.js request context.
 */
export function resolveClientAddress(
  params: ResolveClientAddressParams,
): string {
  const { headerGetter, trustProxy, trustedHeader } = params;

  const isTrustProxyEnabled =
    trustProxy === true ||
    (typeof trustProxy === "string" &&
      trustProxy.trim().toLowerCase() === "true");

  if (!isTrustProxyEnabled) {
    return FALLBACK_CLIENT_ADDRESS;
  }

  const configuredHeader = (trustedHeader || "x-real-ip")
    .toLowerCase()
    .trim();

  if (!ALLOWED_TRUSTED_HEADERS.has(configuredHeader)) {
    return FALLBACK_CLIENT_ADDRESS;
  }

  const rawHeaderValue = headerGetter(configuredHeader);
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
}

/**
 * Derive a client identifier for login throttling from Next.js request headers.
 */
export async function getClientAddress(): Promise<string> {
  try {
    const headerStore = await nextHeaders();
    return resolveClientAddress({
      headerGetter: (name) => headerStore.get(name),
      trustProxy: process.env.AUTH_TRUST_PROXY,
      trustedHeader: process.env.AUTH_TRUSTED_IP_HEADER,
    });
  } catch {
    return FALLBACK_CLIENT_ADDRESS;
  }
}
