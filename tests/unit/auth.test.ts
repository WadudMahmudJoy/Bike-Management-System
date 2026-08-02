import { describe, it, expect, afterEach, vi } from "vitest";
import { normalizeEmail, validateAndNormalizeEmail } from "@/lib/auth/email";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  verifyAgainstDummy,
} from "@/lib/auth/password";
import { generateSessionToken, hashSessionToken } from "@/lib/auth/token";
import {
  getSessionCookieName,
  getAdminSessionCookieOptions,
  DEV_COOKIE_NAME,
  PROD_COOKIE_NAME,
  SESSION_LIFETIME_MS,
} from "@/lib/auth/constants";
import {
  getClientAddress,
  resolveClientAddress,
  FALLBACK_CLIENT_ADDRESS,
} from "@/lib/auth/client-address";
import { hasRequiredRole } from "@/lib/auth/authorization";
import type { AdminSessionDTO } from "@/lib/auth/types";

describe("Email Primitives & Whitespace Normalization", () => {
  it("trims surrounding whitespace and converts to lowercase", () => {
    expect(normalizeEmail("  Admin@Example.COM  ")).toBe("admin@example.com");
  });

  it("validates and normalizes valid email address with leading/trailing whitespace", () => {
    expect(validateAndNormalizeEmail("   User.Name+Tag@Domain.CO.UK   ")).toBe(
      "user.name+tag@domain.co.uk",
    );
  });

  it("rejects invalid email formats", () => {
    expect(validateAndNormalizeEmail("invalid-email")).toBeNull();
    expect(validateAndNormalizeEmail("user@")).toBeNull();
    expect(validateAndNormalizeEmail("@domain.com")).toBeNull();
    expect(validateAndNormalizeEmail("")).toBeNull();
  });
});

describe("Password Primitives (Argon2id)", () => {
  it("hashes and correctly verifies valid password", async () => {
    const password = "SuperSecurePassword123!";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^\$argon2id\$/);
    const isValid = await verifyPassword(hash, password);
    expect(isValid).toBe(true);
  });

  it("fails verification with wrong password", async () => {
    const hash = await hashPassword("CorrectPassword123!");
    const isValid = await verifyPassword(hash, "WrongPassword123!");
    expect(isValid).toBe(false);
  });

  it("rejects short password under 12 characters", () => {
    const res = validatePasswordPolicy("Short123!");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Password must be at least 12 characters.");
  });

  it("rejects password over 128 characters", () => {
    const longPassword = "A".repeat(129);
    const res = validatePasswordPolicy(longPassword);
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Password must not exceed 128 characters.");
  });

  it("rejects whitespace-only password", () => {
    const res = validatePasswordPolicy("            ");
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Password cannot be empty or whitespace-only.");
  });

  it("runs constant-work dummy verification returning false", async () => {
    const res = await verifyAgainstDummy("AnyPasswordAttempt123!");
    expect(res).toBe(false);
  });
});

describe("Token Primitives", () => {
  it("generates unique cryptographically random tokens", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(40);
  });

  it("produces deterministic SHA-256 hash matching format", () => {
    const token = "sample-session-token-12345";
    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(token).not.toBe(hash1);
  });
});

describe("Client Address Pure Resolver & Proxy Trust", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores spoofed header and returns unknown-client when trust proxy is disabled", () => {
    const address = resolveClientAddress({
      headerGetter: (name) =>
        name === "x-forwarded-for" ? "203.0.113.195" : null,
      trustProxy: "false",
      trustedHeader: "x-forwarded-for",
    });
    expect(address).toBe(FALLBACK_CLIENT_ADDRESS);
    expect(FALLBACK_CLIENT_ADDRESS).toBe("unknown-client");
  });

  it("returns stable fallback when header is missing", () => {
    const address = resolveClientAddress({
      headerGetter: () => null,
      trustProxy: true,
      trustedHeader: "x-real-ip",
    });
    expect(address).toBe(FALLBACK_CLIENT_ADDRESS);
  });

  it("accepts valid IPv4 address when proxy trust is enabled", () => {
    const address = resolveClientAddress({
      headerGetter: (name) => (name === "x-real-ip" ? "203.0.113.195" : null),
      trustProxy: true,
      trustedHeader: "x-real-ip",
    });
    expect(address).toBe("203.0.113.195");
  });

  it("accepts valid IPv6 address when proxy trust is enabled", () => {
    const address = resolveClientAddress({
      headerGetter: (name) => (name === "x-real-ip" ? "2001:db8::1" : null),
      trustProxy: "true",
      trustedHeader: "x-real-ip",
    });
    expect(address).toBe("2001:db8::1");
  });

  it("rejects malformed IP address format", () => {
    const address = resolveClientAddress({
      headerGetter: (name) =>
        name === "x-real-ip" ? "invalid-ip-address" : null,
      trustProxy: "true",
      trustedHeader: "x-real-ip",
    });
    expect(address).toBe(FALLBACK_CLIENT_ADDRESS);
  });

  it("rejects comma-separated multi-IP header values", () => {
    const address = resolveClientAddress({
      headerGetter: (name) =>
        name === "x-forwarded-for" ? "203.0.113.195, 70.41.3.18" : null,
      trustProxy: true,
      trustedHeader: "x-forwarded-for",
    });
    expect(address).toBe(FALLBACK_CLIENT_ADDRESS);
  });

  it("rejects oversized candidate values exceeding 45 characters", () => {
    const oversized = "a".repeat(46);
    const address = resolveClientAddress({
      headerGetter: (name) => (name === "x-real-ip" ? oversized : null),
      trustProxy: true,
      trustedHeader: "x-real-ip",
    });
    expect(address).toBe(FALLBACK_CLIENT_ADDRESS);
  });

  it("rejects unallowlisted header configuration", () => {
    const address = resolveClientAddress({
      headerGetter: (name) =>
        name === "x-custom-header" ? "203.0.113.195" : null,
      trustProxy: true,
      trustedHeader: "x-custom-header",
    });
    expect(address).toBe(FALLBACK_CLIENT_ADDRESS);
  });

  it("request wrapper getClientAddress returns unknown-client fallback by default", async () => {
    vi.stubEnv("AUTH_TRUST_PROXY", "false");
    const address = await getClientAddress();
    expect(address).toBe(FALLBACK_CLIENT_ADDRESS);
  });
});

describe("Cookie Configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses development cookie name in non-production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getSessionCookieName()).toBe(DEV_COOKIE_NAME);
    expect(DEV_COOKIE_NAME).toBe("sdb_admin_session");
  });

  it("uses __Host- prefixed cookie name in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getSessionCookieName()).toBe(PROD_COOKIE_NAME);
    expect(PROD_COOKIE_NAME).toBe("__Host-sdb_admin_session");
  });

  it("returns secure cookie options in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    const options = getAdminSessionCookieOptions(expiresAt);

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect((options as unknown as Record<string, unknown>).domain).toBeUndefined();
    expect(options.maxAge).toBeGreaterThan(0);
    expect(options.maxAge).toBeLessThanOrEqual(Math.floor(SESSION_LIFETIME_MS / 1000));
    expect(options.expires).toEqual(expiresAt);
  });

  it("enforces secure: true in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    const options = getAdminSessionCookieOptions(expiresAt);

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect((options as unknown as Record<string, unknown>).domain).toBeUndefined();
    expect(options.maxAge).toBeGreaterThan(0);
    expect(options.maxAge).toBeLessThanOrEqual(Math.floor(SESSION_LIFETIME_MS / 1000));
  });
});

describe("Role Authorization", () => {
  const ownerAdmin: AdminSessionDTO = {
    id: "admin-1",
    name: "Owner User",
    email: "owner@example.com",
    role: "OWNER",
  };

  const staffAdmin: AdminSessionDTO = {
    id: "admin-2",
    name: "Staff Admin",
    email: "staff@example.com",
    role: "ADMIN",
  };

  it("accepts OWNER role for OWNER requirements", () => {
    expect(hasRequiredRole(ownerAdmin, "OWNER")).toBe(true);
    expect(hasRequiredRole(ownerAdmin, "OWNER", "ADMIN")).toBe(true);
  });

  it("rejects ADMIN role for OWNER-only requirements", () => {
    expect(hasRequiredRole(staffAdmin, "OWNER")).toBe(false);
  });

  it("accepts ADMIN role when ADMIN is permitted", () => {
    expect(hasRequiredRole(staffAdmin, "ADMIN")).toBe(true);
  });
});
