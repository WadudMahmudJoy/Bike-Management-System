# Testing Checklist

This document provides the authoritative quality assurance and verification checklist for the **Bike Management System** (Sristy-Dristy Bike House).

---

## Standard Verification (Required Every Phase)

Before claiming any phase is complete, the following commands must be run and confirmed passing:

```bash
pnpm install --frozen-lockfile
docker compose config
docker compose up -d --wait
docker compose ps
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate status
pnpm exec prisma db seed
pnpm exec prisma db seed
pnpm db:test-integrity
pnpm lint
pnpm typecheck
pnpm build
pnpm audit --audit-level=high
pnpm exec prisma migrate diff --exit-code --from-config-datasource --to-schema prisma/schema.prisma
git diff --check
```

- [x] `pnpm install --frozen-lockfile` passes cleanly.
- [x] `pnpm why sharp` confirms single patched version `0.35.3` (no version < 0.35.0).
- [x] `pnpm why postcss` confirms single patched version `8.5.25` (no version <= 8.5.17).
- [x] `pnpm lint` passes with 0 errors.
- [x] `pnpm typecheck` passes with 0 errors (`tsc --noEmit`).
- [x] `pnpm build` completes successfully.
- [x] `pnpm exec prisma validate` passes with synthetic environment `DATABASE_URL`.
- [x] `pnpm audit --audit-level=high` passes with 0 vulnerabilities and exit code 0.
- [x] `git diff --check` shows no whitespace or merge conflict markers.
- [x] No TypeScript `any` types used without documented technical justification.
- [x] No secrets, `.env` files, NID images, or customer data committed to Git.
- [x] `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md` updated.

---

## Phase 0 Verification — Foundation & Setup

- [x] Next.js 16 App Router project initialized with TypeScript strict mode.
- [x] Tailwind CSS 4 design tokens configured (`globals.css`).
- [x] Prisma 7 configured (`prisma.config.ts`, `schema.prisma`).
- [x] Zod installed for schema validation.
- [x] Clean homepage placeholder (`/`) builds cleanly.
- [x] Admin placeholder (`/admin`) builds cleanly.
- [x] Health endpoint (`/api/health`) builds cleanly.
- [x] Baseline durable documentation created in `docs/`.

---

## Phase 0.5 & 0.5.1 & 0.5.2 Verification — Baseline, Hardening, Security Gate & CI Runtime

- [x] **Gitignore Corrected:** `/prisma/migrations/**/migration_lock.toml` rule removed from `.gitignore`.
- [x] **Package Manager Locked:** `"packageManager": "pnpm@11.1.2"` present in `package.json`.
- [x] **pnpm Workspace Overrides (`pnpm-workspace.yaml`):** Overrides configured at root level for `sharp` (`0.35.3`) and `postcss` (`8.5.25`).
- [x] **Blocking Security Gate (`.github/workflows/ci.yml`):** `pnpm audit --audit-level=high` runs as a mandatory blocking CI check.
- [x] **GitHub Actions Runtime Updated (Phase 0.5.2):** Actions updated to `actions/checkout@v6`, `pnpm/action-setup@v6`, `actions/setup-node@v6` with `persist-credentials: false`. Node 20 deprecation warning eliminated.
- [x] **Prisma CI Step:** Added `pnpm exec prisma validate` step in CI using placeholder `DATABASE_URL`.
- [x] **Security Headers Configured (`next.config.ts`):** `poweredByHeader: false`, `nosniff`, `DENY`, `strict-origin-when-cross-origin`, strict `Permissions-Policy`, `X-Robots-Tag` on `/admin` and `/api/*`, production HSTS.
- [x] **Health Endpoint Hardened (`/api/health`):** Minimal JSON response with `no-store` cache headers.
- [x] **SEO & Site Configuration (`src/lib/site-config.ts`):** Environment validation for `SITE_URL` and `SITE_INDEXING_ENABLED`.
- [x] **SEO Metadata Ownership Corrected:** Root layout defines global defaults; page components export canonical links and page Open Graph URLs.
- [x] **Robots & Sitemap Route Handlers:** `robots.ts` disallows `/admin/` and `/api/`; `sitemap.ts` returns empty array `[]` when indexing is disabled.

---

## Phase 1 & Phase 1.1 Verification — Database Environment, Prisma Schema & Integrity Controls

- [x] **PostgreSQL 18 Development Environment (`compose.yaml`):** Local `postgres:18-alpine` container configured with volume mounted at `/var/lib/postgresql`, bound strictly to `127.0.0.1:5434`, with healthcheck using `pg_isready`.
- [x] **Script-Based Shadow Initializer (`01-create-shadow-database.sh`):** Committed script with `set -eu` and safe identifier validation initializing `POSTGRES_SHADOW_DB` on first boot.
- [x] **Prisma 7 Driver Adapter Integration:** Configured `@prisma/adapter-pg` and `pg.Pool` in `src/lib/prisma.ts` and `prisma/seed.ts` with output path `src/generated/prisma`.
- [x] **Complete Data Model (26 Entities & 25 Enum Groups):** Implemented all required models including `AdminUser.normalizedEmail`.
- [x] **Relation Safety Rules:** Financial records (`Purchase`, `Sale`, `PurchasePayment`, `SalePayment`, `Expense`, `CustomerIdentity`, `CustomerBankAccount`, `CustomerDocument`, `CustomerAccount`, `BikeDocument`, `BikeStatusHistory`) enforce `onDelete: Restrict`.
- [x] **Custom SQL Check Constraints & Migration Safety:** Applied initial migration `20260801174101_init_dealership_schema` and corrective migration `20260802000215_phase1_integrity_corrections`.
- [x] **Partial Unique Index:** `idx_bike_image_cover` created on `BikeImage(bikeId) WHERE isCover = true` to guarantee at most one cover image per bike.
- [x] **Database Immutability Triggers:** Verified triggers `fn_prevent_purchase_payment_tampering`, `fn_prevent_sale_payment_tampering`, `fn_prevent_expense_tampering`, `fn_prevent_audit_log_tampering`, and `fn_prevent_bike_status_history_tampering`.
- [x] **Idempotent Seed Script (`prisma/seed.ts`):** Populates singleton non-sensitive `ShopSetting` entries (`Sristy-Dristy Bike House` / `Sristy-Dristy Enterprise`). Running seed twice succeeds cleanly.
- [x] **Committed Integrity Test Suite (`pnpm db:test-integrity`):** Executed 37-point runtime integrity test suite inside a rolled-back transaction.
- [x] **CI Database Integration (`.github/workflows/ci.yml`):** Added PostgreSQL 18 service container, automated migration deploy, status check, schema drift check, double-pass seed check, and `pnpm db:test-integrity`.
