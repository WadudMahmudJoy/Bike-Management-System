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
- **Token Delivery:** Delivered exclusively via HTTP cookies set by Server Actions. Raw tokens are never returned to Client Components, never logged, and never stored in the database.
- **Database Storage:** The `AdminSession` table stores only the SHA-256 hex digest (`sessionTokenHash`).
- **Session Expiry:** Absolute lifetime of 12 hours (`SESSION_LIFETIME_MS = 43200000`).

---

## 5. Cookie Policy & Testability

- **Development Cookie Name:** `sdb_admin_session`
- **Production Cookie Name:** `__Host-sdb_admin_session` (enforces strict origin binding)
- **Standardized Cookie Options (`getAdminSessionCookieOptions`):**
  - `httpOnly: true` (prevents JavaScript access)
  - `sameSite: "lax"` (mitigates CSRF while enabling normal navigation)
  - `path: "/"`
  - `secure: true` in production (`secure: false` allowed only for local HTTP development)
  - `domain`: Intentionally omitted to comply with `__Host-` prefix requirements.

---

## 6. Client Address Resolution & Proxy Trust

- **Default Untrusted Mode:** Forwarding headers (`x-forwarded-for`, `x-real-ip`, etc.) are untrusted by default. When `AUTH_TRUST_PROXY` is false or unset, `getClientAddress()` returns the stable fallback identifier `unknown-client`.
- **Trusted Proxy Configuration:** Enabled only when `AUTH_TRUST_PROXY="true"` is explicitly set in environment variables and `AUTH_TRUSTED_IP_HEADER` names an explicitly allowlisted header (e.g. `x-real-ip`).
- **IP Validation:** Extracted header values are validated using Node's `net.isIP()`. Comma-separated multi-IP lists and malformed inputs are rejected and fall back to `unknown-client`.
- **Privacy Guarantee:** Raw IP addresses are never logged or exposed in public error responses.

---

## 7. Atomic Concurrency-Safe Login Throttling

- **Mechanism:** Keyed HMAC-SHA256 (`createHmac("sha256", AUTH_RATE_LIMIT_SECRET)`).
- **Key Input:** `normalizedEmail:clientAddress` hex digest stored in `AdminLoginThrottle.keyHash`.
- **Privacy:** Neither raw email nor IP address is stored in the database.
- **Atomic UPSERT Query:** `recordFailedAttempt()` uses an atomic PostgreSQL `INSERT ... ON CONFLICT ("keyHash") DO UPDATE ...` query. This guarantees zero lost increments under high concurrency and eliminates transaction serialization aborts.
- **Policy:**
  - Max Failures: 5 failed attempts (`MAX_LOGIN_ATTEMPTS = 5`).
  - Window Duration: 15 minutes (`THROTTLE_WINDOW_MS = 900000`).
  - Block Duration: 15 minutes (`BLOCK_DURATION_MS = 900000`).
- **Clearing:** Successful login clears the matching throttle entry inside the atomic login transaction.
- **Public Error Responses:** Generic and non-disclosing:
  - Invalid credentials: `"Invalid email or password."`
  - Throttled attempt: `"Too many sign-in attempts. Please try again later."`

---

## 8. Server-Side Authentication Service & Atomic Login Transaction

- **Authentication Service (`authenticateAdminCredentials`):** Server-only service encapsulating email validation, throttle verification, constant-work dummy password verification, Argon2id verification, failed attempt recording, and atomic success handling.
- **Atomic Database Transaction:** On credential success, `prisma.$transaction` performs all database writes in one atomic unit:
  1. Updates `AdminUser.lastLoginAt`
  2. Creates `AdminSession` record storing SHA-256 token hash
  3. Creates `ADMIN_LOGIN_SUCCESS` AuditLog with `entityType: "AdminSession"` and `entityId: session.id`
  4. Deletes the exact matching `AdminLoginThrottle` record
- **Cookie Security:** The Server Action sets the HttpOnly cookie using the returned `rawToken` after the database transaction succeeds. If cookie delivery fails, the newly created session is revoked.

---

## 9. Next.js Proxy & Authorization DAL Separation

### Next.js Proxy (`src/proxy.ts`)
- Exports precise `config.matcher = ["/admin", "/admin/:path*"]`.
- Explicitly excludes `/admin/login` from redirection logic.
- Inspects only the environment-appropriate session cookie name (`__Host-sdb_admin_session` in production, `sdb_admin_session` in dev).
- **Security Rule:** Proxy does NOT import Prisma, database drivers, or Argon2 native modules, and does NOT treat cookie presence as verified authentication.

### Data Access Layer (DAL & Server Authorization)
- `requireAdmin()` in `src/lib/auth/dal.ts` executes full database session verification.
- Enforces session expiration (`expiresAt > now`), revocation (`revokedAt === null`), and account status (`isActive === true`).
- Uses React `cache()` for request-scoped deduplication across layouts and page components.
- Role enforcement (`requireAdminRole("OWNER")`) checks `admin.role`.

---

## 10. Owner Bootstrap CLI (`pnpm admin:create`)

- Executable via `pnpm admin:create` (`scripts/create-admin.ts`).
- Preloads `scripts/register-server-only-mock.cjs` to resolve `server-only` imports during CLI execution.
- Verified by a dedicated non-interactive TTY smoke test (`pnpm test:admin-cli-smoke`).
- **Interactive TTY Enforcement:** Fails immediately with exit code 1 if executed non-interactively or piped.
- **Password Input:** Uses raw terminal mode to mask password entry with asterisks (`*`).
- **Atomic Bootstrap Transaction:** Uses a `Serializable` transaction to atomically check existing account count, assign `OWNER` role to the first account (`AdminUser.count() === 0`), create the `AdminUser`, and write an `ADMIN_BOOTSTRAP_CREATED` AuditLog.

---

## 11. Testing & Non-Destructive Teardown

- **Unit Test Suite (`pnpm test`):** 20 unit tests verifying email normalization, Argon2id hashing, dummy verification, token entropy, SHA-256 digests, client address proxy trust, cookie options, and role authorization.
- **Integration Test Suite (`pnpm test:admin-auth`):** 17 integration tests calling production session functions (`createAdminSessionRecord`, `verifyAdminSessionToken`, `revokeAdminSessionToken`), production auth service (`authenticateAdminCredentials`), concurrent throttling, audit trail references, and non-destructive cleanup.
- **Non-Destructive Teardown:** Synthetic test rows are generated and validated inside an isolated ROLLBACK transaction. Pre-existing throttle rows are verified to survive test suite execution without deletion.

---

## 12. Deferred Features

The following features are explicitly deferred to future phases:
- Two-Factor Authentication (2FA) / WebAuthn
- Password Reset via Email / SMS
- Customer Online Authentication (Phase 12)
- OAuth / Social Logins
- Session Management & Remote Revocation UI
- Distributed Rate Limiting (Redis / Upstash)
