import "server-only";

// ---------------------------------------------------------------------------
// Session Configuration
// ---------------------------------------------------------------------------

/** Session absolute lifetime in milliseconds (12 hours). */
export const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Cookie Names & Options
// ---------------------------------------------------------------------------

/** Development cookie name. */
export const DEV_COOKIE_NAME = "sdb_admin_session";

/** Production cookie name with __Host- prefix for strict security. */
export const PROD_COOKIE_NAME = "__Host-sdb_admin_session";

/** Get the appropriate cookie name based on environment. */
export function getSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? PROD_COOKIE_NAME
    : DEV_COOKIE_NAME;
}

export interface AdminSessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  expires: Date;
}

/**
 * Get standardized cookie configuration options for session cookies.
 * Computes maxAge from supplied authoritative expiresAt so maxAge never exceeds
 * remaining database-session lifetime.
 */
export function getAdminSessionCookieOptions(
  expiresAt: Date,
): AdminSessionCookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  const remainingMs = expiresAt.getTime() - Date.now();
  const maxAgeSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
    expires: expiresAt,
  };
}

// ---------------------------------------------------------------------------
// Password Policy
// ---------------------------------------------------------------------------

/** Minimum password length. */
export const MIN_PASSWORD_LENGTH = 12;

/** Maximum password length. */
export const MAX_PASSWORD_LENGTH = 128;

// ---------------------------------------------------------------------------
// Argon2id Configuration
// ---------------------------------------------------------------------------

/**
 * Argon2id hashing parameters.
 * - memoryCost: 19456 KiB (~19 MiB)
 * - timeCost: 2 iterations
 * - parallelism: 1 lane
 *
 * These values follow the OWASP recommended minimum for Argon2id.
 */
export const ARGON2_MEMORY_COST = 19456;
export const ARGON2_TIME_COST = 2;
export const ARGON2_PARALLELISM = 1;

// ---------------------------------------------------------------------------
// Login Throttling
// ---------------------------------------------------------------------------

/** Maximum failed login attempts before blocking. */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Throttle window duration in milliseconds (15 minutes). */
export const THROTTLE_WINDOW_MS = 15 * 60 * 1000;

/** Block duration after max failures in milliseconds (15 minutes). */
export const BLOCK_DURATION_MS = 15 * 60 * 1000;
