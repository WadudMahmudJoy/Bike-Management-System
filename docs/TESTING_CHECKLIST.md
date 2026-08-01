# Testing Checklist

This document provides the authoritative quality assurance and verification checklist for the **Bike Management System** (Sristy-Dristy Bike House).

---

## Standard Verification (Required Every Phase)

Before claiming any phase is complete, the following commands must be run and confirmed passing:

```bash
pnpm install --frozen-lockfile
docker compose config
docker compose up -d --wait
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate status
pnpm exec prisma migrate diff --exit-code --from-config-datasource --to-schema prisma/schema.prisma
pnpm exec prisma db seed
pnpm lint
pnpm typecheck
pnpm build
pnpm audit --audit-level=high
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

## Phase 1 Verification — Database Environment, Prisma Schema & Integrity Controls

- [x] **PostgreSQL 18 Development Environment (`compose.yaml`):** Local `postgres:18-alpine` container configured with volume `bike_postgres_data`, bound strictly to `127.0.0.1:5434`, with healthcheck using `pg_isready`.
- [x] **Shadow Database Initialization (`01-create-shadow-database.sql`):** `bike_management_shadow` created on first container boot for Prisma development migrations.
- [x] **Prisma 7 Driver Adapter Integration:** Configured `@prisma/adapter-pg` and `pg.Pool` in `src/lib/prisma.ts` and `prisma/seed.ts` with output path `src/generated/prisma`.
- [x] **Complete Data Model (26 Entities & 25 Enum Groups):** Implemented all required models (`AdminUser`, `AdminSession`, `AuditLog`, `Customer`, `CustomerRole`, `CustomerIdentity`, `CustomerBankAccount`, `CustomerDocument`, `CustomerAccount`, `Bike`, `BikeImage`, `BikeCondition`, `BikeDocument`, `BikeStatusHistory`, `Purchase`, `PurchasePayment`, `Sale`, `SalePayment`, `Expense`, `Offer`, `OfferBike`, `BikeRequest`, `SellBikeRequest`, `SellBikeRequestImage`, `Inquiry`, `InspectionBooking`, `ShopSetting`).
- [x] **Relation Safety Rules:** Financial records (`Purchase`, `Sale`, `PurchasePayment`, `SalePayment`, `Expense`, `CustomerIdentity`, `CustomerBankAccount`, `CustomerDocument`, `CustomerAccount`, `BikeDocument`, `BikeStatusHistory`) enforce `onDelete: Restrict`. Non-destructive cascading reserved for child entities (`CustomerRole`, `BikeImage`, `BikeCondition`, `OfferBike`, `SellBikeRequestImage`).
- [x] **Custom SQL Check Constraints:** Added constraints for positive purchase/agreed prices, nonnegative sale prices (`finalPrice <= listedPrice`), positive payment amounts, positive engine capacity, nonnegative mileage, year ranges (1900–2100), budget ranges, offer validity, percentage limits, and void metadata consistency.
- [x] **Partial Unique Index:** `idx_bike_image_cover` created on `BikeImage(bikeId) WHERE isCover = true` to guarantee at most one cover image per bike.
- [x] **Database Immutability Triggers:** Verified triggers `fn_prevent_purchase_payment_tampering`, `fn_prevent_sale_payment_tampering`, `fn_prevent_audit_log_tampering`, and `fn_prevent_bike_status_history_tampering` block deletions, block field mutations, and restrict voiding to one-way transitions with metadata.
- [x] **Idempotent Seed Script (`prisma/seed.ts`):** Populates singleton non-sensitive `ShopSetting` entries (`Sristy-Dristy Bike House` / `Sristy-Dristy Enterprise`). Running seed twice succeeds without creating duplicate rows.
- [x] **CI Database Integration (`.github/workflows/ci.yml`):** Added PostgreSQL 18 service container, automated migration deploy (`prisma migrate deploy`), status check (`prisma migrate status`), schema drift check (`prisma migrate diff`), and seed check (`prisma db seed`).

---

## Upcoming Phase Checklists (Phases 2–13)

### Phase 2 — Admin Authentication & Admin Shell
- [ ] Admin login interface operational with Argon2id password hashing.
- [ ] `HttpOnly`, `Secure`, `SameSite` cookies store session tokens.
- [ ] Database `AdminSession` stores `sessionTokenHash`.
- [ ] Server middleware enforces authorization on `/admin/*` routes.
- [ ] Session revocation and login rate limiting verified.

### Phase 3 — Customer Management
- [ ] Customer CRUD operations functional.
- [ ] Phone normalization and duplicate warnings working.
- [ ] NID status lifecycle (`PENDING` -> `SUBMITTED` -> `VERIFIED`) enforced.
- [ ] AES-256-GCM encryption active for NID and bank accounts.
- [ ] HMAC-SHA256 duplicate NID lookup active.
- [ ] Private customer document storage operational with signed URLs.

### Phase 4 — Bike Inventory
- [ ] Bike CRUD functional with canonical statuses (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`).
- [ ] Photo gallery upload, ordering, and primary selection working.
- [ ] `BikeCondition` inspection report form operational.
- [ ] `BikeStatusHistory` audit log populated on status changes.

### Phase 5 — Shop Purchase Workflow
- [ ] Acquisition transaction workflow operational (`Purchase`).
- [ ] Outgoing payment ledger (`PurchasePayment`) functional with `paidAt` and `receiptNumber`.
- [ ] Dynamic seller payable calculated server-side.
- [ ] Multi-record operations wrapped in Prisma transactions.

### Phase 6 — Customer Sale Workflow
- [ ] Sale transaction workflow operational (`Sale`).
- [ ] Incoming payment ledger (`SalePayment`) functional with `receivedAt` and `receiptNumber`.
- [ ] Dynamic buyer due calculated server-side.
- [ ] Public bike status transitions to `SOLD` upon sale confirmation.

### Phase 7 — Financial Ledgers & Auditing
- [ ] Receivables and payables summary views accurate.
- [ ] Payment receipt generation functional.
- [ ] Void operations recorded with audit reasons.
- [ ] Redacted `AuditLog` entries generated for all financial mutations.

### Phase 8 — Public Showroom
- [ ] Catalogue page (`/bikes`) with dynamic filtering operational.
- [ ] Bike details page (`/bikes/[id]`) rendering images, specs, and WhatsApp CTA.
- [ ] Schema.org structured data integrated.
- [ ] Dynamic `/sitemap.xml` populating active available bikes.

### Phase 9 — Sell-Bike Submissions
- [ ] Public `/sell-your-bike` submission form and photo upload operational.
- [ ] Admin review interface (`SellBikeRequest`) functional.

### Phase 10 — Requested-Bike Workflow
- [ ] Public `/request-a-bike` form with structured min/max budget working.
- [ ] Admin matching interface (`BikeRequest`) functional.

### Phase 11 — Offers, Enquiries & Expenses
- [ ] Promotional offers (`Offer` & `OfferBike`) active.
- [ ] General inquiry and inspection booking forms functional.
- [ ] Operational expense ledger (`Expense`) operational.

### Phase 12 — Optional Customer Portal
- [ ] Customer account registration (`CustomerAccount`) operational.
- [ ] Read-only customer portal working.

### Phase 13 — Deployment & Audit
- [ ] Full security audit completed.
- [ ] Production deployment configured with verified HTTPS.
- [ ] Database backup and restore test executed successfully.
