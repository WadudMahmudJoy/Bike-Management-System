# Project Status

## Current Phase

**PHASE 3A — Customer Core Management, Customer Roles, Controlled Duplicate Detection, Search, Archiving, Audit History, and Premium Admin UI (Completed & PR Created)**

## Status

**Pull Request Created against `main` on branch `phase-3/customer-management` (Unmerged, pending review)** — Phase 3A has implemented Bangladesh phone normalization (`+8801XXXXXXXXX`), Crockford Base32 customer code generation (`CUS-XXXXXXXX`), multi-role assignment (`BUYER`, `SELLER`, `POTENTIAL_BUYER`, `POTENTIAL_SELLER`, `BIKE_REQUESTER`), controlled duplicate phone warnings, server-side duplicate confirmation rechecking, `PENDING` default NID status, soft-archiving (`isArchived`), masked contact display in list views, full contact display in authenticated detail views, optimistic concurrency control using expected `updatedAt`, privacy-sanitized `AuditLog` records, premium dark admin UI for `/admin/customers`, 20 unit tests, 13 integration test assertions (including transaction rollback verification), package script `pnpm test:customers`, and updated CI workflow.

---

## Completed Work (Phases 0 through 3A)

### 1. Application & Tooling Foundation
- Next.js 16.2.12 App Router initialized with TypeScript (strict mode), Tailwind CSS 4, ESLint 9, `src/` directory.
- Prisma 7 configured with `@prisma/adapter-pg` driver adapter (`prisma.config.ts`, `prisma/schema.prisma`).
- Zod installed for payload validation.
- Package manager locked in `package.json` (`"packageManager": "pnpm@11.1.2"`).

### 2. Local PostgreSQL 18 Container Environment (`compose.yaml`)
- Containerized PostgreSQL 18 (`postgres:18-alpine`) with project-scoped volume mounted at `/var/lib/postgresql`, bound strictly to `127.0.0.1:5434`.
- Automated initialization script `docker/postgres/init/01-create-shadow-database.sh` with `set -eu` and safe identifier validation creates shadow database `POSTGRES_SHADOW_DB` on first boot.

### 3. Complete Prisma 7 Data Model & Schema State
- Implemented 27 normalized entities in `prisma/schema.prisma`, including `Customer`, `CustomerRole`, `CustomerIdentity`, `AuditLog`, `AdminUser.normalizedEmail`, and `AdminLoginThrottle`.

### 4. Database Migrations (`20260801174101_init_dealership_schema`, `20260802000215_phase1_integrity_corrections`, & `20260802042936_phase2_admin_auth_throttling`)
- Zero schema modifications or migrations were required for Phase 3A as the existing PostgreSQL schema fully supports all customer core capabilities.

### 5. Secure Admin Authentication Primitives (`src/lib/auth/`)
- OWASP-aligned Argon2id hashing, SHA-256 session token digests (`AdminSession.sessionTokenHash`), HTTP-Only secure cookies, privacy-preserving login throttling with HMAC-SHA256 digests, pure edge proxy trust resolver (`AUTH_TRUST_PROXY`), DAL authorization (`requireAdmin()`), interactive owner bootstrap CLI (`pnpm admin:create`), and premium dark admin shell.

### 6. Phase 3A Customer Management Domain (`src/lib/customer/`)
- **Phone Normalization & Masking (`phone.ts`):** Normalizes BD mobile numbers to canonical `+8801XXXXXXXXX`. Provides safe masking (`+880 17***-**78`) for list views and non-privileged displays.
- **Customer Code Generator (`customer-code.ts`):** Produces immutable, collision-resistant codes in `CUS-XXXXXXXX` format using Crockford Base32 with database unique constraint check and 5-attempt retry loop.
- **Controlled Duplicate-Phone Workflow (`service.ts`, `queries.ts`):** Queries existing active/archived customers sharing normalized primary phone. Returns structured warning unless confirmed. Rechecks duplicates server-side on confirmation to compare against expected duplicate ID set.
- **Optimistic Concurrency & Archiving:** Atomic `UPDATE` queries matching `id` and `expectedUpdatedAt`. Soft-deactivation using `isArchived` flag. Hard deletion unavailable.
- **Privacy Audit Logging (`audit.ts`):** Records non-sensitive summaries for `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_ARCHIVED`, and `CUSTOMER_RESTORED`. Full contact details, notes, NID, bank details, and tokens are never logged.

### 7. Premium Customer Administration UI (`src/app/admin/(protected)/customers/`)
- Enabled `Customers` nav item in `admin-shell.tsx`.
- List Page (`page.tsx`): Obsidian/Graphite design, search bar, role/NID/archive filters, clear filters, table with customer code, name, masked phone, roles, NID status badge (`PENDING`), state badge, pagination.
- Create Page (`new/page.tsx` & `customer-form.tsx`): Form controls, multi-role checkboxes, interactive duplicate warning modal.
- Detail Page (`[id]/page.tsx`): Customer code, profile info, full contact display for authenticated admins, `PENDING` NID status badge, creator admin info, safe audit timeline.
- Edit Page (`[id]/edit/page.tsx`): Pre-populated form, optimistic concurrency timestamp control, duplicate phone recheck.
- Server Actions (`actions.ts`): `'use server'` wrappers calling `requireAdmin()` and delegating server-derived admin identity to customer services.

### 8. Unit & Integration Test Suites
- **Vitest Unit Suite (`pnpm test`):** 47 passing unit tests (including 20 customer domain tests for phone normalization, masking, Crockford Base32 generator, and validation schemas).
- **Database Integration Suite (`pnpm test:customers`):** 13 integration assertions verifying customer creation, `PENDING` identity status, zero bank accounts, controlled duplicate warning, duplicate override confirmation, distinct family shared phone records, update with role replacement, optimistic concurrency rejection, bounded search query, archive/restore, audit creation, redaction, and transaction rollback cleanup.
- **CI Sequence (`.github/workflows/ci.yml`):** Added `pnpm test:customers` step to mandatory CI sequence.

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
| Unit Tests (Vitest) | ✅ Pass | `pnpm test` -> 47 / 47 PASSED CLEANLY |
| Admin Auth Integration Tests | ✅ Pass | `pnpm test:admin-auth` -> ALL 23 TESTS PASSED CLEANLY |
| Admin CLI Smoke Test | ✅ Pass | `pnpm test:admin-cli-smoke` -> ALL 4 TESTS PASSED CLEANLY |
| Customer Integration Tests | ✅ Pass | `pnpm test:customers` -> ALL PASSED CLEANLY (Transaction rolled back) |
| ESLint | ✅ Pass | `pnpm lint` -> 0 errors, 0 warnings |
| Typecheck | ✅ Pass | `pnpm typecheck` (`tsc --noEmit`) -> 0 errors |
| Next.js Build | ✅ Pass | `pnpm build` -> Production build clean |
| Security Audit | ✅ Pass | `pnpm audit --audit-level=high` -> 0 vulnerabilities |
| Git Diff Check | ✅ Pass | `git diff --check` -> Clean formatting |

---

## Current Branch & Git State

- **Branch:** `phase-3/customer-management`
- **Base Branch:** `main`
- **Working Tree:** Clean
- **Pull Request:** Created against `main`, title: `Phase 3A: add customer core management` (Unmerged)

---

## Phase Scope & Privacy Confirmation

- **Raw NID:** ❌ Not collected or stored.
- **Bank Details:** ❌ Not collected or stored.
- **Customer Login:** ❌ Not created.
- **Document Uploads:** ❌ Not implemented.
- **PR Status:** ❌ Not merged (awaiting review).
- **Phase 3B:** ❌ Not started.
