# Project Status

## Current Phase

**Phase 2 — Secure Admin Authentication, Database Sessions, Login Throttling, Authorization DAL, Next.js Proxy Protection, Admin Login, Premium Admin Shell, Tests, CI, Documentation, and Pull Request**

## Status

**Implemented on Feature Branch (`phase-2/admin-authentication`), PR Pending Review** — All Phase 2 security primitives, Argon2id credential verification, SHA-256 session token hashing, HTTP-only secure cookie handling, HMAC-SHA256 login throttling, database migration `20260802042936_phase2_admin_auth_throttling`, Server Actions login/logout handlers, request-scoped DAL authorization, optimistic proxy edge routing (`src/proxy.ts`), interactive owner bootstrap CLI (`pnpm admin:create`), premium dark admin shell layout, 16 unit tests, and 12 database integration tests have been implemented, executed, and verified.

---

## Completed Work (Phases 0 through 2)

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
- **Argon2id Hashing:** `hashPassword` and `verifyPassword` using OWASP-aligned parameters (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`). Constant-work dummy verification (`verifyAgainstDummy`) for non-existent accounts.
- **Session Tokens:** 32-byte cryptographically random base64url tokens (`generateSessionToken`). Database stores SHA-256 hex digest (`sessionTokenHash`).
- **Cookie Policy:** `sdb_admin_session` in development, `__Host-sdb_admin_session` in production (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in prod, 12-hour expiry).
- **Rate-Limited Throttling:** HMAC-SHA256 key (`normalizedEmail:clientAddress`), 5 failures max, 15-minute window, 15-minute block duration. Non-disclosing error messages.
- **DAL & Role Authorization:** `requireAdmin()` and `requireAdminRole()` with React `cache()` request deduplication.

### 6. Edge Proxy Routing & Server Actions
- `src/proxy.ts`: Optimistic cookie-presence redirect for `/admin/*` routes (excluding `/admin/login`). Avoids Prisma/Argon2 imports at the edge.
- `src/app/admin/login/actions.ts`: Server Actions for login and logout with Zod validation, throttle enforcement, atomic transaction logging, and safe redirects.

### 7. Interactive Owner Bootstrap CLI (`pnpm admin:create`)
- `scripts/create-admin.ts`: Interactive TTY CLI prompt for creating administrative accounts. Automatically grants `OWNER` role to the first account. Hidden password entry, full policy validation, and audit logging.

### 8. Premium Admin Shell Layout
- Redesigned `/admin/login`, `/admin/(protected)/layout.tsx`, `/admin/(protected)/admin-shell.tsx`, and `/admin/(protected)/dashboard/page.tsx` adhering to Obsidian (`#0A0A0A`), Graphite (`#1A1A1A`), Warm Ivory (`#F5F0E8`), and Muted Champagne (`#C8B88A`) design tokens.

### 9. Unit & Integration Test Suites
- **Vitest Unit Suite (`pnpm test`):** 16 unit tests covering password policy, Argon2id hashing, dummy verification, email normalization, token entropy, SHA-256 digests, cookie rules, and role authorization.
- **Database Integration Suite (`pnpm test:admin-auth`):** 12 integration tests verifying session creation, expiration, revocation, inactive account rejection, 5-attempt throttling lifecycle, throttle clearing, and safe logout cleanup.

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
| Unit Tests (Vitest) | ✅ Pass | `pnpm test` -> 16 / 16 PASSED CLEANLY |
| Admin Auth Integration Tests | ✅ Pass | `pnpm test:admin-auth` -> ALL 12 TESTS PASSED CLEANLY |
| ESLint | ✅ Pass | `pnpm lint` -> 0 errors, 0 warnings |
| Typecheck | ✅ Pass | `pnpm typecheck` (`tsc --noEmit`) -> 0 errors |
| Next.js Build | ✅ Pass | `pnpm build` -> Production build clean |
| Security Audit | ✅ Pass | `pnpm audit --audit-level=high` -> 0 vulnerabilities |
| Git Diff Check | ✅ Pass | `git diff --check` -> Clean formatting |

---

## Current Branch & Git State

- **Branch:** `phase-2/admin-authentication`
- **Working Tree:** Clean / Managed

---

## Known Limitations & Deferred Features

- Customer authentication is deferred to Phase 12.
- 2FA / WebAuthn, password reset via SMS/Email, OAuth, and remote session management UI are deferred.
- Production trusted reverse-proxy header configuration is deferred to deployment phase.

---

## Next Approved Phase

**Phase 3 — Customer Management**

> **Explicit Boundary:** Phase 3 must NOT begin until PR for Phase 2 is reviewed and explicit user approval is granted.
