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
pnpm test
pnpm test:admin-auth
pnpm test:admin-cli-smoke
pnpm test:customers
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
- [x] `pnpm why fast-uri` confirms single patched version `3.1.5` (no version < 3.1.5).
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
- [x] **pnpm Workspace Overrides (`pnpm-workspace.yaml`):** Overrides configured at root level for `sharp` (`0.35.3`), `postcss` (`8.5.25`), and `fast-uri` (`3.1.5`).
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
- [x] **Complete Data Model (27 Entities & 25 Enum Groups):** Implemented all required models including `AdminUser.normalizedEmail`.
- [x] **Relation Safety Rules:** Financial records (`Purchase`, `Sale`, `PurchasePayment`, `SalePayment`, `Expense`, `CustomerIdentity`, `CustomerBankAccount`, `CustomerDocument`, `CustomerAccount`, `BikeDocument`, `BikeStatusHistory`) enforce `onDelete: Restrict`.
- [x] **Custom SQL Check Constraints & Migration Safety:** Applied initial migration `20260801174101_init_dealership_schema` and corrective migration `20260802000215_phase1_integrity_corrections`.
- [x] **Partial Unique Index:** `idx_bike_image_cover` created on `BikeImage(bikeId) WHERE isCover = true` to guarantee at most one cover image per bike.
- [x] **Database Immutability Triggers:** Verified triggers `fn_prevent_purchase_payment_tampering`, `fn_prevent_sale_payment_tampering`, `fn_prevent_expense_tampering`, `fn_prevent_audit_log_tampering`, and `fn_prevent_bike_status_history_tampering`.
- [x] **Idempotent Seed Script (`prisma/seed.ts`):** Populates singleton non-sensitive `ShopSetting` entries (`Sristy-Dristy Bike House` / `Sristy-Dristy Enterprise`). Running seed twice succeeds cleanly.
- [x] **Committed Integrity Test Suite (`pnpm db:test-integrity`):** Executed 37-point runtime integrity test suite inside a rolled-back transaction.
- [x] **CI Database Integration (`.github/workflows/ci.yml`):** Added PostgreSQL 18 service container, automated migration deploy, status check, schema drift check, double-pass seed check, and `pnpm db:test-integrity`.

---

## Phase 2 Verification — Secure Admin Authentication & Shell

- [x] **Argon2id Hashing:** Password policy (12–128 chars, non-whitespace), hashing, and verification implemented using OWASP parameters (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`).
- [x] **Anti-Enumeration Timing Safety:** `verifyAgainstDummy` implemented to ensure CPU-time parity for non-existent accounts.
- [x] **Session Token Security:** 32-byte cryptographically random base64url tokens. Database stores SHA-256 hex digest (`sessionTokenHash`).
- [x] **Cookie Security Configuration:** `sdb_admin_session` in dev, `__Host-sdb_admin_session` in prod (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in prod).
- [x] **Login Rate Limiting & Throttling:** `AdminLoginThrottle` table created via migration `20260802042936_phase2_admin_auth_throttling` with custom CHECK constraints (`failureCount >= 0`, `keyHash ~ '^[a-f0-9]{64}$'`, `blockedUntil >= windowStartedAt`). HMAC-SHA256 keying preserves email/IP privacy. 5 failures block for 15 minutes.
- [x] **Next.js Proxy & DAL Separation:** `src/proxy.ts` performs lightweight cookie-presence check without DB/Crypto dependencies. Real authorization runs in `requireAdmin()` with React `cache()` request deduplication.
- [x] **Server Actions for Login & Logout:** Form validation, atomic audit logging, session creation/revocation, and non-disclosing error messages.
- [x] **Interactive Bootstrap CLI (`pnpm admin:create`):** Interactive TTY script with masked password entry for bootstrapping administrative accounts.
- [x] **Premium Dark UI Theme:** Admin shell (`admin-shell.tsx`), login page (`login/page.tsx`), and dashboard (`dashboard/page.tsx`) styled using Obsidian, Graphite, Warm Ivory, and Muted Champagne design tokens.
- [x] **Unit Test Suite (`pnpm test`):** 27 unit tests covering password policy, hashing, email normalization, tokens, cookies, and role authorization.
- [x] **Admin Auth Integration Suite (`pnpm test:admin-auth`):** 23 integration tests verifying session lifecycle, expiration, revocation, throttling, and idempotent logout with automatic synthetic test data cleanup.
- [x] **CI Pipeline Integration:** Updated `.github/workflows/ci.yml` with synthetic `AUTH_RATE_LIMIT_SECRET`, `pnpm test`, and `pnpm test:admin-auth`.

---

## Phase 3A, 3A.1, & 3A.2 Verification — Customer Core Management

- [x] **Explicit Page Authorization:** Every customer route page (`list`, `new`, `detail`, `edit`) calls `await requireAdmin();` before parameter resolution or database queries.
- [x] **Bangladesh Phone Normalization:** BD mobile numbers standardized to canonical `+8801XXXXXXXXX` format.
- [x] **Crockford Base32 Customer Code:** `CUS-XXXXXXXX` generated using Crockford Base32 alphabet with database unique constraint check and 5-attempt retry loop.
- [x] **Controlled Duplicate Phone Workflow:** Structured duplicate warning modal displays matching customer codes, names, masked phones, roles, and archive states.
- [x] **Phone-Change-Only Duplicate Detection:** Unchanged phone edits proceed directly without duplicate confirmation. Phone changes or creation with duplicate numbers require duplicate set confirmation.
- [x] **Atomic Concurrency Control:** Mandatory `expectedUpdatedAt` ISO timestamp for `archiveCustomer`, `restoreCustomer`, `updateCustomer`. Atomic `updateMany` matches `id` + `updatedAt` + `isArchived`.
- [x] **Domain Error Sanitization:** Raw database/Prisma errors sanitized into safe, high-level messages.
- [x] **Non-Throwing Bounded Filter Parsing:** `parseCustomerFilters(params)` caps search query to 100 characters and defaults invalid params safely without causing HTTP 500 errors.
- [x] **Payload Minimization (`CustomerEditDTO`):** Edit page maps details to minimal `CustomerEditDTO`, stripping audit history, creator info, normalized phone numbers, NID status, and archive state. Creator queries exclude admin email.
- [x] **Form Submission Hardening:** `CustomerForm` guards `handleSubmit` against re-entry and disables submit/modal buttons with pending labels (`"Creating..."`, `"Saving..."`, `"Processing..."`).
- [x] **Privacy Audit Log Redaction:** Audit log metadata records high-level summaries (`CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_ARCHIVED`, `CUSTOMER_RESTORED`). Contact details, email, notes, NID, bank details, and tokens are never logged.
- [x] **Unit Test Suite (`pnpm test`):** 35 customer unit tests (62 total project unit tests) covering phone normalization, Crockford Base32 generator, validation, non-throwing filter parser, error sanitization, and edit payload mapping.
- [x] **Customer Integration Test Suite (`pnpm test:customers`):** 16-point integration suite executing customer creation, duplicate detection, unchanged phone edit, overlong query safety, email exclusion, optimistic concurrency conflict, archive/restore, and transaction rollback cleanup with zero deprecation warnings.
