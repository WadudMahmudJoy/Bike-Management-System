# Handoff — For Future Coding Agents

This document provides the necessary context, constraints, and instructions for any future AI coding agent (Claude, Gemini, or other) continuing development on this repository.

---

## Mandatory Initial Step: Read Required Files

Before writing code or editing files, read these documents in full:

1. `AGENTS.md` — Coding rules, architecture separation, financial rules, and security guidelines.
2. `docs/HANDOFF.md` — This file (current state, exact next task, and constraints).
3. `docs/PROJECT_STATUS.md` — Current project state and completed work.
4. `docs/AUTHENTICATION_DESIGN.md` — Authoritative authentication architecture specification.
5. `docs/IMPLEMENTATION_PLAN.md` — 14-phase development roadmap.
6. `docs/ARCHITECTURE.md` — Full-stack system architecture and directory layout.
7. `docs/DATABASE_DESIGN.md` — Authoritative database design specification.
8. `docs/SECURITY_REQUIREMENTS.md` — Security baseline, planned controls, and production requirements.
9. `docs/SEO_REQUIREMENTS.md` — SEO technical requirements and metadata rules.
10. `docs/PRODUCT_SPEC.md` — Complete MVP feature requirements.
11. `docs/DECISIONS.md` — Locked decisions.
12. `docs/CUSTOMER_ACCOUNT_DECISION.md` — Customer account policy and account-linking rules.
13. `docs/TESTING_CHECKLIST.md` — Verification checklist.

---

## Current System Architecture & Database State

- **Monolith Framework:** Next.js 16 App Router full-stack monolith (`src/app/`).
- **Language & Styling:** Strict TypeScript (`tsconfig.json`), Tailwind CSS 4 (`globals.css`).
- **Database & ORM:** PostgreSQL 18 & Prisma 7 (`@prisma/adapter-pg` & `pg.Pool`).
- **Container Environment:** Local PostgreSQL 18 containerized in `compose.yaml` (`bike-postgres`), bound strictly to `127.0.0.1:5434`.
- **Implemented Database Schema:** 27 business entities and 25 enum groups in `prisma/schema.prisma`, including `AdminUser.normalizedEmail` and `AdminLoginThrottle`.
- **Applied Migrations:**
  - `20260801174101_init_dealership_schema`
  - `20260802000215_phase1_integrity_corrections`
  - `20260802042936_phase2_admin_auth_throttling` (custom CHECK constraints for throttle failure count, keyHash hex format, and blockedUntil relation).
- **Authentication Stack:** Argon2id credential hashing (`argon2`), SHA-256 session token digests (`AdminSession`), `HttpOnly` secure session cookies using exact session `expiresAt` with remaining-lifetime `maxAge`, atomic UPSERT login rate limiting clearing stale `blockedUntil` on window rollover, server-only authentication service (`authenticateAdminCredentials`), atomic session revocation (`revokeAdminSessionToken`), focused production logout service (`logoutAdminSession`), Server Actions (`src/app/admin/login/actions.ts`), request-scoped React `cache()` DAL (`src/lib/auth/dal.ts`), edge proxy protection (`src/proxy.ts`), interactive owner bootstrap CLI (`scripts/create-admin.ts`) with 3-attempt serializable retry, and premium dark admin shell (`src/app/admin/(protected)/admin-shell.tsx`).
- **Test Suites:**
  - 37-point runtime database integrity test suite (`pnpm db:test-integrity`).
  - 27-point Vitest auth unit test suite (`pnpm test`).
  - 23-point admin auth database integration test suite (`pnpm test:admin-auth`).
  - 4-point owner CLI non-interactive smoke test (`pnpm test:admin-cli-smoke`).
- **CI Pipeline:** `.github/workflows/ci.yml` includes PostgreSQL 18 service container with `pg_isready -U postgres -d bike_management_test`, `prisma validate`, `prisma generate`, `prisma migrate deploy`, `prisma migrate status`, `prisma migrate diff`, double-pass `prisma db seed`, `pnpm db:test-integrity`, `pnpm test`, `pnpm test:admin-auth`, `pnpm test:admin-cli-smoke`, lint, typecheck, build, and blocking audit gate.

---

## Locked Decisions & Core Constraints

- **Future Agents Continue From `main`:** PR #7 has been merged into `main` via merge commit `ccf91b36a9365f07a387e2466420c7cf2b8c1835`. The temporary feature branch `phase-2/admin-authentication` was deleted. Do not refer to it as an active branch.
- **Do Not Rewrite Applied Migrations:** The migrations in `prisma/migrations/` are applied and tracked in Git. Do not rewrite, modify, or delete applied migrations. Future schema modifications must be executed via new migrations (`prisma migrate dev --name <name>`).
- **No Unimplemented Assumptions:** Do not assume customer CRUD, bike CRUD, or payment processing logic exist. Inspect the codebase first.
- **Strict Proxy & DAL Separation:** `src/proxy.ts` performs optimistic cookie checks only and MUST NOT import Prisma or Argon2. Real authorization MUST execute in Server Components and Server Actions via `requireAdmin()`.
- **Untrusted Forwarding Headers:** `getClientAddress()` untrusts forwarding headers by default (`AUTH_TRUST_PROXY="false"`). Trusted proxy mode requires explicit environment enablement (`AUTH_TRUST_PROXY="true"`).
- **No Default Credentials & Manual First-Owner Creation:** No default admin credentials exist in code, seeds, or fixtures. The first owner account creation is an explicit manual operational step using `pnpm admin:create`.
- **Financial Integrity:** Dynamic server-side calculation only. Append-only ledger logic enforced by database triggers. No floating-point arithmetic for money.

---

## Verification Commands

Before claiming any task or phase is complete, run:

```powershell
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate status
pnpm db:test-integrity
pnpm test
pnpm test:admin-auth
pnpm test:admin-cli-smoke
pnpm lint
pnpm typecheck
pnpm build
pnpm audit --audit-level=high
pnpm exec prisma migrate diff --exit-code --from-config-datasource --to-schema prisma/schema.prisma
git diff --check
```

---

## Next Planned Task: Phase 3 — Customer Management

Phase 3 Customer Management is the next planned phase on the roadmap, but work must NOT begin until explicit user approval is provided:
1. Build Customer CRUD interfaces (create, view, edit, list, filter).
2. Implement Bangladesh phone number normalization (`+880` prefix format) and duplicate warnings.
3. Implement NID lifecycle (`PENDING` -> `SUBMITTED` -> `VERIFIED`).
4. Implement AES-256-GCM authenticated encryption for NID and bank accounts.
5. Implement HMAC-SHA256 duplicate NID lookup index.
6. Implement private object storage for customer document uploads with time-limited signed URLs.
7. Update `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md`.

---

**Phase 2 is fully merged into `main`. Do not begin Phase 3 until the user gives explicit approval.**
