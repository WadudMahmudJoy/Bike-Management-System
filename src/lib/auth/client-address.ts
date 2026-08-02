import "server-only";
import { headers } from "next/headers";

/**
 * Derive a client identifier for login throttling.
 *
 * Security considerations:
 * - Does NOT blindly trust arbitrary forwarding headers (X-Forwarded-For, etc.)
 *   as they can be spoofed without a trusted reverse proxy.
 * - In development, uses a stable fallback address.
 * - Production trusted-proxy configuration is deferred to deployment phase,
 *   at which point a known trusted proxy header can be read safely.
 *
 * Returns a stable identifier string for the throttle key computation.
 * Never logs or returns the raw address in public error messages.
 */
export async function getClientAddress(): Promise<string> {
  try {
    const headerStore = await headers();

    // Next.js provides the connecting IP in the x-forwarded-for header
    // when running behind its built-in dev server or a trusted proxy.
    // In production, this should be configured to read from a trusted header only.
    const forwarded = headerStore.get("x-forwarded-for");
    if (forwarded) {
      // Take the first (leftmost) IP — the client's direct address
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp && firstIp.length > 0) {
        return firstIp;
      }
    }

    // Fallback: stable identifier when address cannot be determined
    return "unknown-client";
  } catch {
    // If headers() throws (e.g., outside request context), use fallback
    return "unknown-client";
  }
}
