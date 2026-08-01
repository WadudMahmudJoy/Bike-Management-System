# Project Status

## Current Phase

**Phase 1 & Phase 1.1 — PostgreSQL Development Environment, Complete Prisma Schema, Migration Hardening, Seed Foundation, and CI Integrity Tests**

## Status

**Implemented on Feature Branch (`phase-1/postgres-prisma-schema`), PR #1 Pending Review** — All Phase 1 and Phase 1.1 database environment setup, 26 Prisma models, initial and corrective migrations with custom check constraints, engine-level payment and expense immutability triggers, driver adapter integration, idempotent seed foundation, 37-point runtime integrity test suite, and CI PostgreSQL service integration have been implemented and verified.

---

## Completed Work (Phases 0 through 1.1)

### 1. Application & Tooling Foundation
- Next.js 16.2.12 App Router initialized with TypeScript (strict mode), Tailwind CSS 4, ESLint 9, `src/` directory.
- Prisma 7 configured with `@prisma/adapter-pg` driver adapter (`prisma.config.ts`, `prisma/schema.prisma`).
- Zod installed for payload validation.
- Package manager locked in `package.json` (`"packageManager": "pnpm@11.1.2"`).

### 2. Local PostgreSQL 18 Container Environment (`compose.yaml`)
- Containerized PostgreSQL 18 (`postgres:18-alpine`) with project-scoped volume mounted at `/var/lib/postgresql`, bound strictly to `127.0.0.1:5434`.
- Automated initialization script `docker/postgres/init/01-create-shadow-database.sh` with `set -eu` and safe identifier validation creates shadow database `POSTGRES_SHADOW_DB` on first boot.

### 3. Complete Prisma 7 Data Model (26 Entities & 25 Enum Groups)
- Implemented 26 normalized entities matching `docs/DATABASE_DESIGN.md` in `prisma/schema.prisma`, including `AdminUser.normalizedEmail` for case-insensitive authentication queries.

### 4. Migrations & Engine-Level Integrity (`20260801174101_init_dealership_schema` & `20260802000215_phase1_integrity_corrections`)
- Applied migrations containing:
  - Custom PostgreSQL CHECK constraints for money (>0), prices (`finalPrice = listedPrice - discountAmount`), year ranges (1900–2100), budgets, display order, encryption bundle completeness, and void consistency.
  - Partial unique index `idx_bike_image_cover` restricting cover images to max 1 per bike.
  - Immutability triggers `fn_prevent_purchase_payment_tampering`, `fn_prevent_sale_payment_tampering`, `fn_prevent_expense_tampering`, `fn_prevent_audit_log_tampering`, and `fn_prevent_bike_status_history_tampering` blocking payment and expense deletions, field mutations, and unvoiding operations.

### 5. Driver Adapter & Idempotent Seed (`src/lib/prisma.ts` & `prisma/seed.ts`)
- Configured server-only `src/lib/prisma.ts` singleton using `@prisma/adapter-pg` and `pg.Pool`.
- Created idempotent `prisma/seed.ts` seeding `ShopSetting` foundation (`Sristy-Dristy Bike House` / `Sristy-Dristy Enterprise`). Tested running seed twice with zero duplicate rows.

### 6. 37-Point Runtime Integrity Test Suite (`pnpm db:test-integrity`)
- Created `scripts/test-database-integrity.ts` executing 37 database assertions (triggers, constraints, partial index) inside a rolled-back transaction.

### 7. CI Database Integration (`.github/workflows/ci.yml`)
- Added PostgreSQL 18 service container with automated migration deploy (`prisma migrate deploy`), status check (`prisma migrate status`), schema drift check (`prisma migrate diff`), double-pass seed check (`prisma db seed`), and runtime integrity test (`pnpm db:test-integrity`).

---

## Verification Summary

| Verification Step | Result | Command / Details |
|---|---|---|
| Compose Config | ✅ Pass | `docker compose config` valid |
| Fresh Volume Bootstrap | ✅ Pass | Tested temporary project `temp-bike-test` on port 5439 -> Healthy |
| Normal PostgreSQL Container | ✅ Pass | Container `bike-postgres` healthy on `127.0.0.1:5434` |
| Prisma Schema Validate | ✅ Pass | `pnpm exec prisma validate` -> Schema valid 🚀 |
| Prisma Client Generate | ✅ Pass | `pnpm exec prisma generate` -> Output to `src/generated/prisma` |
| Migration Status | ✅ Pass | `pnpm exec prisma migrate status` -> Up to date |
| Schema Drift Check | ✅ Pass | `pnpm exec prisma migrate diff` -> 0 differences detected |
| Idempotent Seed | ✅ Pass | `pnpm exec prisma db seed` -> Seeded twice cleanly |
| Runtime Integrity Tests | ✅ Pass | `pnpm db:test-integrity` -> ALL 37 TESTS PASSED CLEANLY |
| ESLint | ✅ Pass | `pnpm lint` -> 0 errors |
| Typecheck | ✅ Pass | `pnpm typecheck` (`tsc --noEmit`) -> 0 errors |
| Next.js Build | ✅ Pass | `pnpm build` -> Production build clean |
| Security Audit | ✅ Pass | `pnpm audit --audit-level=high` -> 0 vulnerabilities |
| Git Diff Check | ✅ Pass | `git diff --check` -> Clean formatting |

---

## Current Branch & Git State

- **Branch:** `phase-1/postgres-prisma-schema`
- **Working Tree:** Clean

---

## Known Limitations

- No runtime authentication or session cookie management active yet (Phase 2).
- No runtime AES-256-GCM encryption/decryption routines active yet (Phase 3).
- Local database user `bike_admin` is privileged for development migration convenience; production least-privilege role separation is deferred to deployment phase.

---

## Next Approved Phase

**Phase 2 — Admin Authentication, Session Management, Security Middleware, and Admin Shell Layout**

> **Explicit Boundary:** Phase 2 must NOT begin until PR #1 is reviewed and explicit user permission is granted.
