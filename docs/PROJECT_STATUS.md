# Project Status

## Current Phase

**Phase 2 — Secure Admin Authentication, Database Sessions, Atomic Login Throttling & Rollover, Atomic Logout & Revocation, Authorization DAL, Next.js Proxy Protection, Admin Login, Premium Admin Shell, Tests, CI, Documentation, and Pull Request (Merged into `main`)**

## Status

**Merged into `main` via PR #7 (Merge Commit: `ccf91b36a9365f07a387e2466420c7cf2b8c1835`, Main CI Run #30761606954 Passed)** — All Phase 2, 2.1, 2.2, & 2.3 security primitives, Argon2id credential verification, SHA-256 session token hashing, HTTP-only secure cookie handling using exact session `expiresAt` with remaining-lifetime `maxAge`, atomic UPSERT login throttling with stale `blockedUntil` rollover clearing, pure proxy trust resolver (`AUTH_TRUST_PROXY`), database migration `20260802042936_phase2_admin_auth_throttling`, server-only authentication service (`authenticateAdminCredentials`), atomic login transaction, atomic session revocation using conditional `updateMany`, focused logout production service (`logoutAdminSession`), UI error feedback for failed logout, request-scoped DAL authorization, optimistic proxy edge routing (`src/proxy.ts`), interactive owner bootstrap CLI (`pnpm admin:create`) with 3-attempt serializable retry, non-interactive TTY CLI smoke test (`pnpm test:admin-cli-smoke`), premium dark admin shell layout, 27 unit tests, 23 database integration tests (including real multi-connection concurrency, window rollover, and atomic concurrent logout tests), strict process exit code cleanup verification, and clean CI Postgres service health check (`pg_isready -U postgres -d bike_management_test`) have been implemented, verified, merged into `main`, and fully validated by main-branch CI.

---

## Completed Work (Phases 0 through 2.3)

### 1. Application & Tooling Foundation
- Next.js 16.2.12 App Router initialized with TypeScript (strict mode), Tailwind CSS 4, ESLint 9, `src/` directory.
- Prisma 7 configured with `@prisma/adapter-pg` driver adapter (`prisma.config.ts`, `prisma/schema.prisma`).
- Zod installed for payload validation.
- Package manager locked in `package.json` (`"packageManager": "pnpm@11.1.2"`).

### 2. Local PostgreSQL 18 Container Environment (`compose.yaml`)
- Containerized PostgreSQL 18 (`postgres:18-alpine`) with project-scoped volume mounted at `/var/lib/postgresql`, bound strictly to `127.0.0.1:5434`.
- Automated initialization script `docker/postgres/init/01-create-shadow-database.sh` with `set -eu` and safe identifier validation creates shadow database `POSTGRES_SHADOW_DB` on first boot.

### 3. Complete Prisma 7 Data Model & Phase 2 Throttling Model
- Implemented 27 normalized entities in `prisma/schema.prisma`, including `AdminUser.normalizedEmail` for case-insensitive authentication queries and `AdminLoginThrottle` for rate limiting.

### 4. Database Migrations (`20260801174101_init_dealership_schema`, `20260802000215_phase1_integrity_corrections`, & `20260802042936_phase2_admin_auth_throttling`)
- Applied migrations containing:
  - Custom PostgreSQL CHECK constraints for money, year ranges (1900–2100), percentage limits, void consistency, throttle failure counts (`failureCount >= 0`), 64-char hex key hashes (`keyHash ~ '^[a-f0-9]{64}$'`), and valid throttle block timestamps (`blockedUntil >= windowStartedAt`).
  - Partial unique index `idx_bike_image_cover` restricting cover images to max 1 per bike.
  - Immutability triggers blocking payment, expense, audit log, and status history deletions and field mutations.

### 5. Secure Admin Authentication Primitives (`src/lib/auth/`)
- **Argon2id Hashing:** `hashPassword` and `verifyPassword` using OWASP-aligned parameters (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`). Constant-work dummy verification (`verifyAgainstDummy`) for non-existent accounts. Password length guard (>128 chars rejected before Argon2).
- **Session Tokens:** 32-byte cryptographically random base64url tokens (`generateSessionToken`). Database stores SHA-256 hex digest (`sessionTokenHash`).
- **Cookie Policy & Options:** Standardized helper `getAdminSessionCookieOptions` using exact session `expiresAt` and dynamic remaining-lifetime `maxAge` (`sdb_admin_session` in dev, `__Host-sdb_admin_session` in prod, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in prod).
- **Rate-Limited Throttling & Rollover:** Atomic PostgreSQL UPSERT statement (`INSERT ... ON CONFLICT ("keyHash") DO UPDATE ...`) clearing stale `blockedUntil` on window rollover, using HMAC-SHA256 key (`normalizedEmail:clientAddress`), 5 failures max, 15-minute window, 15-minute block duration. Non-disclosing error messages.
- **Client Address Resolution:** Pure `resolveClientAddress` resolver untrusting arbitrary headers by default (`AUTH_TRUST_PROXY="false"` fallback `unknown-client`), validating IPv4/IPv6 with `net.isIP()`, rejecting comma-separated multi-IPs and oversized strings (>45 chars).
- **DAL & Role Authorization:** `requireAdmin()` and `requireAdminRole()` with React `cache()` request deduplication.

### 6. Edge Proxy Routing & Authentication Service
- `src/proxy.ts`: Optimistic cookie-presence redirect with matcher `["/admin", "/admin/:path*"]` excluding `/admin/login`. Avoids Prisma/Argon2 imports at the edge. Checks environment-appropriate cookie name.
- `src/lib/auth/auth-service.ts`: Server-only `authenticateAdminCredentials` encapsulating email validation, throttle check, dummy verification, Argon2id verification, and atomic login success transaction (`lastLoginAt` update, session creation, `ADMIN_LOGIN_SUCCESS` AuditLog with `entityType: "AdminSession"` and `entityId: session.id`, and throttle clearing).
- `src/lib/auth/session.ts`: Atomic session revocation (`revokeAdminSessionToken`) using conditional `updateMany`, focused production logout service (`logoutAdminSession`), and request-cookie wrapper (`logoutAdmin`) returning structured `RevokeSessionResult`.
- `src/app/admin/login/actions.ts`: Server Actions for login and logout delegating to `authenticateAdminCredentials` and `logoutAdmin`. Returns error state on logout database failure without deleting cookie or redirecting.

### 7. Interactive Owner Bootstrap CLI (`pnpm admin:create`)
- `scripts/create-admin.ts`: Interactive TTY CLI prompt preloading `register-server-only-mock.cjs`. Automatically grants `OWNER` role to first account inside a `Serializable` transaction with 3-attempt bounded retry for `P2034` conflicts. Verified by non-interactive smoke test (`pnpm test:admin-cli-smoke`).

### 8. Premium Admin Shell Layout & Logout Failure Handling
- Redesigned `/admin/login`, `/admin/(protected)/layout.tsx`, `/admin/(protected)/admin-shell.tsx`, and `/admin/(protected)/dashboard/page.tsx` adhering to Obsidian (`#0A0A0A`), Graphite (`#1A1A1A`), Warm Ivory (`#F5F0E8`), and Muted Champagne (`#C8B88A`) design tokens. Displays UI error message if logout database revocation fails.

### 9. Unit & Integration Test Suites
- **Vitest Unit Suite (`pnpm test`):** 27 unit tests covering password policy, Argon2id hashing, dummy verification, email normalization, token entropy, SHA-256 digests, pure client address proxy trust across IPv4/IPv6/malformed/comma-separated branches, cookie options, and role authorization.
- **Database Integration Suite (`pnpm test:admin-auth`):** 23 integration tests verifying session creation, verification, expiration, structured revocation, inactive account rejection, 5-attempt throttling, real multi-connection concurrency throttling (5 simultaneous calls outside transaction), window rollover clearing stale `blockedUntil`, exact expiry matching, atomic concurrent logout audit references, simulated DB failures, and non-destructive isolated ROLLBACK cleanup.
- **CLI Smoke Test (`pnpm test:admin-cli-smoke`):** 4 smoke test assertions verifying non-interactive TTY protection.

---

## Verification Summary

| Verification Step | Result | Command / Details |
|---|---|---|
| Compose Config | ✅ Pass | `docker compose config` valid |
| PostgreSQL Container | ✅ Pass | Container `bike-postgres` healthy on `127.0.0.1:5434` |
| Prisma Schema Validate | ✅ Pass | `pnpm exec prisma validate` -> Schema valid 🚀 |
| Prisma Client Generate | ✅ Pass | `pnpm exec prisma generate` -> Output to `src/generated/prisma` |
| Migration Status | ✅ Pass | `pnpm exec prisma migrate status` -> Up to date |
| Schema Drift Check | ✅ Pass | `pnpm exec prisma migrate diff` -> 0 differences detected |
| Idempotent Seed | ✅ Pass | `pnpm exec prisma db seed` -> Seeded twice cleanly |
| Runtime Integrity Tests | ✅ Pass | `pnpm db:test-integrity` -> ALL 37 TESTS PASSED CLEANLY |
| Unit Tests (Vitest) | ✅ Pass | `pnpm test` -> 27 / 27 PASSED CLEANLY |
| Admin Auth Integration Tests | ✅ Pass | `pnpm test:admin-auth` -> ALL 23 TESTS PASSED CLEANLY |
| Admin CLI Smoke Test | ✅ Pass | `pnpm test:admin-cli-smoke` -> ALL 4 TESTS PASSED CLEANLY |
| ESLint | ✅ Pass | `pnpm lint` -> 0 errors, 0 warnings |
| Typecheck | ✅ Pass | `pnpm typecheck` (`tsc --noEmit`) -> 0 errors |
| Next.js Build | ✅ Pass | `pnpm build` -> Production build clean |
| Security Audit | ✅ Pass | `pnpm audit --audit-level=high` -> 0 vulnerabilities |
| Git Diff Check | ✅ Pass | `git diff --check` -> Clean formatting |

---

## Current Branch & Git State

- **Branch:** `main`
- **Working Tree:** Expected to be clean (`nothing to commit, working tree clean`)
- **Pull Request:** [PR #7 — Phase 2: add secure admin authentication and shell](https://github.com/WadudMahmudJoy/Bike-Management-System/pull/7) (Merged into `main` via `ccf91b36a9365f07a387e2466420c7cf2b8c1835`)
- **Feature Branch:** `phase-2/admin-authentication` (Deleted after merge)
- **Account State:** No real owner or administrator account has been created yet. The first owner account can be created manually using `pnpm admin:create`.

---

## Known Limitations & Deferred Features

- Customer authentication is deferred to Phase 12.
- 2FA / WebAuthn, password reset via SMS/Email, OAuth, and remote session management UI are deferred.
- Production trusted reverse-proxy header configuration is deployment-controlled via `AUTH_TRUST_PROXY="true"`.

---

## Next Planned Phase

**Phase 3 — Customer Management**

> **Explicit Boundary:** Phase 3 must NOT begin until explicit user approval is granted.
