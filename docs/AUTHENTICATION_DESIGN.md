# Authentication Architecture Design

This document specifies the authoritative authentication architecture for the **Bike Management System** (Customer-facing: **Sristy-Dristy Bike House**, Legal: **Sristy-Dristy Enterprise**).

---

## 1. Overview

The administrative authentication system provides secure, database-backed session management, credential verification, rate-limited login throttling, role-based authorization, and optimistic edge proxy routing for all administrative operations.

---

## 2. Password Policy & Hashing Specification

### Argon2id Hashing Parameters
- **Algorithm:** Argon2id (`argon2.argon2id`)
- **Memory Cost:** 19,456 KiB (~19 MiB)
- **Time Cost:** 2 iterations
- **Parallelism:** 1 lane
- **OWASP Alignment:** Sourced from OWASP Password Storage Guidelines.

### Password Validation Rules
- **Length:** 12 to 128 characters.
- **Character Set:** Full Unicode support including spaces and non-English characters.
- **Forbidden Input:** Empty strings and whitespace-only strings are rejected.
- **Truncation:** No silent truncation is performed.
- **Complexity Rules:** No arbitrary mandatory character class rules (e.g. forced symbols) to prevent user-side password degradation.

### Anti-Enumeration Constant-Work Path
When an unknown email or inactive account is queried during login, authentication executes an Argon2id verification against a precomputed dummy hash (`verifyAgainstDummy`) to ensure CPU-time parity with valid account lookups and prevent timing-based email enumeration attacks.

---

## 3. Email Normalization

- **Display Email:** `AdminUser.email` preserves the user's original casing.
- **Normalized Email:** `AdminUser.normalizedEmail` stores a trimmed, lowercased canonical representation (`@unique @db.VarChar(255)`).
- **Lookup Rule:** Authentication queries query exclusively against `normalizedEmail`.
- **Validation:** Validated using Zod `emailSchema` before normalization. Provider-specific mutations (such as Gmail dot stripping) are intentionally prohibited.

---

## 4. Opaque Session Tokens & Hashing

- **Raw Token Generation:** Cryptographically secure 32-byte random buffer, base64url-encoded (`src/lib/auth/token.ts`).
- **Token Delivery:** Delivered exclusively via HTTP cookies. Raw tokens are never logged or stored in the database.
- **Database Storage:** The `AdminSession` table stores only the SHA-256 hex digest (`sessionTokenHash`).
- **Session Expiry:** Absolute lifetime of 12 hours (`SESSION_LIFETIME_MS = 43200000`).

---

## 5. Cookie Policy

- **Development Cookie Name:** `sdb_admin_session`
- **Production Cookie Name:** `__Host-sdb_admin_session` (enforces strict origin binding)
- **Attributes:**
  - `HttpOnly: true` (prevents JavaScript access)
  - `SameSite: "lax"` (mitigates CSRF while enabling normal navigation)
  - `Path: "/"`
  - `Secure: true` in production (`Secure: false` allowed only for local HTTP development)
  - `Domain`: Intentionally omitted to comply with `__Host-` prefix requirements.

---

## 6. Login Rate Limiting & Throttling

- **Mechanism:** Keyed HMAC-SHA256 (`createHmac("sha256", AUTH_RATE_LIMIT_SECRET)`).
- **Key Input:** `normalizedEmail:clientAddress` hex digest stored in `AdminLoginThrottle.keyHash`.
- **Privacy:** Neither raw email nor IP address is stored in the database.
- **Policy:**
  - Max Failures: 5 failed attempts (`MAX_LOGIN_ATTEMPTS = 5`).
  - Window Duration: 15 minutes (`THROTTLE_WINDOW_MS = 900000`).
  - Block Duration: 15 minutes (`BLOCK_DURATION_MS = 900000`).
- **Clearing:** Successful login clears the throttle entry for the key.
- **Public Error Responses:** Generic and non-disclosing:
  - Invalid credentials: `"Invalid email or password."`
  - Throttled attempt: `"Too many sign-in attempts. Please try again later."`

---

## 7. Next.js Proxy & Authorization DAL Separation

### Next.js Proxy (`src/proxy.ts`)
- Performs **optimistic cookie-presence routing** only.
- Excludes `/admin/login` and non-page static/API paths.
- Redirects unauthenticated requests lacking a session cookie to `/admin/login`.
- **Security Rule:** Proxy does NOT import Prisma, database drivers, or Argon2 native modules, and does NOT treat cookie presence as verified authentication.

### Data Access Layer (DAL & Server Authorization)
- `requireAdmin()` in `src/lib/auth/dal.ts` executes full database session verification.
- Enforces session expiration (`expiresAt > now`), revocation (`revokedAt === null`), and account status (`isActive === true`).
- Uses React `cache()` for request-scoped deduplication across layouts and page components.
- Role enforcement (`requireAdminRole("OWNER")`) checks `admin.role`.

---

## 8. Owner Bootstrap CLI (`pnpm admin:create`)

- Executable via `pnpm admin:create` (`scripts/create-admin.ts`).
- **Interactive TTY Enforcement:** Fails immediately if executed non-interactively or piped.
- **Password Input:** Uses raw terminal mode to mask password entry with asterisks (`*`).
- **First Account Rule:** Automatically assigns the `OWNER` role to the first created account (`AdminUser.count() === 0`). Subsequent accounts default to `ADMIN`.
- **Audit Logging:** Writes an `ADMIN_BOOTSTRAP_CREATED` entry to `AuditLog`.

---

## 9. Deferred Features

The following features are explicitly deferred to future phases:
- Two-Factor Authentication (2FA) / WebAuthn
- Password Reset via Email / SMS
- Customer Online Authentication (Phase 12)
- OAuth / Social Logins
- Session Management & Remote Revocation UI
- Distributed Rate Limiting (Redis / Upstash)
- Production Trusted Reverse-Proxy Header Configuration
