# Project Status

## Current Phase

**PHASE 3A & 3A.1 — Customer Core Management, Customer Roles, Controlled Duplicate Detection, Search, Archiving, Audit History, Security Corrections, & Premium Admin UI (Completed & PR Updated)**

## Status

**Pull Request [#8](https://github.com/WadudMahmudJoy/Bike-Management-System/pull/8) updated against `main` on branch `phase-3/customer-management` (Unmerged, pending review)** — Phase 3A.1 has implemented complete security, concurrency, UI, test, error sanitization, and documentation corrections for Phase 3A.

### Key Phase 3A & 3A.1 Capabilities
1. **Bangladesh Phone Normalization & Masking (`phone.ts`):** Standardized BD mobile numbers to `+8801XXXXXXXXX`. Masked output (`+880 17***-**78`) for list views and non-privileged displays.
2. **Crockford Base32 Customer Code (`customer-code.ts`):** Immutable `CUS-XXXXXXXX` customer codes backed by database unique constraint and 5-attempt retry loop.
3. **Controlled Duplicate Phone Workflow & Phone-Change-Only Check (`service.ts`, `customer-form.tsx`):** Detects existing customers sharing normalized phone. Updating existing records with unchanged phone numbers proceeds directly without duplicate confirmation. Phone changes or creates with duplicate numbers trigger a structured warning modal that rechecks matching duplicate IDs server-side on confirmation.
4. **Mandatory Concurrency Timestamp (`expectedUpdatedAt`):** Status actions (`archiveCustomer`, `restoreCustomer`, `updateCustomer`) require a valid ISO timestamp and execute atomic database updates matching `id` + `updatedAt` + `isArchived`.
5. **Customer Domain Error Sanitization (`service.ts`):** All database, Prisma, and connection infrastructure exceptions are caught and sanitized into safe, high-level user error messages. Raw SQL errors, constraints, and connection strings are strictly redacted.
6. **Sequential Connection Querying (`queries.ts`):** Queries execute sequentially over database clients, completely eliminating PostgreSQL driver transaction client deprecation warnings.
7. **Minimal Mutation Response DTOs (`types.ts`, `actions.ts`):** Server Actions return minimal result DTOs (`customerId`, `isArchived`, `updatedAt`, masked duplicate warnings), eliminating unneeded notes or full customer profile data from action return payloads.
8. **Input & Filter Validation (`validation.ts`):** Strict Zod schemas with fallback defaults prevent HTTP 500 errors on malformed search params, and validate route UUID parameters.
9. **Whitespace Normalization:** Optional fields (`fatherName`, `whatsappNumber`, `email`, `address`, `emergencyContact`, `internalNotes`) trim whitespace and convert empty/blank inputs to `null`.
10. **Premium Admin UI (`/admin/customers/`):** Obsidian/Graphite visual design for list, detail, create, and edit pages with clean checkbox `onChange` handlers and mode-specific modal buttons.
11. **Comprehensive Unit & Integration Verification:** 56 passing Vitest unit tests, 16 passing customer integration assertions with transaction rollback cleanup (`pnpm test:customers`), updated CI pipeline.

---

## Completed Work (Phases 0 through 3A.1)

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
- Zero schema modifications or migrations were required for Phase 3A/3A.1 as the existing PostgreSQL schema fully supports all customer core capabilities.

### 5. Secure Admin Authentication Primitives (`src/lib/auth/`)
- OWASP-aligned Argon2id hashing, SHA-256 session token digests (`AdminSession.sessionTokenHash`), HTTP-Only secure cookies, privacy-preserving login throttling with HMAC-SHA256 digests, pure edge proxy trust resolver (`AUTH_TRUST_PROXY`), DAL authorization (`requireAdmin()`), interactive owner bootstrap CLI (`pnpm admin:create`), and premium dark admin shell.

### 6. Phase 3A & 3A.1 Customer Domain & Administration UI
- Hardened domain service, query module, validation, audit logger, and Server Actions with strict error sanitization, atomic concurrency timestamps, minimal return DTOs, phone-change-only duplicate checks, and clean UI components.

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
| Unit Tests (Vitest) | ✅ Pass | `pnpm test` -> 56 / 56 PASSED CLEANLY |
| Admin Auth Integration Tests | ✅ Pass | `pnpm test:admin-auth` -> ALL 23 TESTS PASSED CLEANLY |
| Admin CLI Smoke Test | ✅ Pass | `pnpm test:admin-cli-smoke` -> ALL 4 TESTS PASSED CLEANLY |
| Customer Integration Tests | ✅ Pass | `pnpm test:customers` -> ALL PASSED CLEANLY (Zero deprecation warnings, transaction rolled back) |
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
- **Pull Request:** [#8](https://github.com/WadudMahmudJoy/Bike-Management-System/pull/8) targeting `main` (Unmerged)

---

## Phase Scope & Privacy Confirmation

- **Raw NID:** ❌ Not collected or stored (`nidStatus: PENDING`).
- **Bank Details:** ❌ Not collected or stored.
- **Customer Login:** ❌ Not created.
- **Document Uploads:** ❌ Not implemented.
- **PR Status:** ❌ Not merged (awaiting review).
- **Phase 3B:** ❌ Not started.
