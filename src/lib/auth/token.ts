import "server-only";
import { randomBytes, createHash } from "crypto";

/**
 * Generate a cryptographically random session token.
 * Returns a base64url-encoded string of at least 32 random bytes.
 * Raw tokens exist only in the session cookie — never in logs or the database.
 */
export function generateSessionToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString("base64url");
}

/**
 * Hash a session token using SHA-256 for database storage.
 * The database stores only the hash; raw tokens are cookie-only.
 * Output is a deterministic hex digest.
 */
export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
