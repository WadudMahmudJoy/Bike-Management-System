# Testing Checklist

This document provides the authoritative quality assurance and verification checklist for the **Bike Management System** (Sristy-Dristy Bike House).

---

## Standard Verification (Required Every Phase)

Before claiming any phase is complete, the following commands must be run and confirmed passing:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm audit --audit-level=high
git diff --check
```

- [x] `pnpm lint` passes with 0 errors.
- [x] `pnpm typecheck` passes with 0 errors (`tsc --noEmit`).
- [x] `pnpm build` completes successfully.
- [x] `pnpm audit --audit-level=high` executed and report verified.
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

## Phase 0.5 Verification — Baseline & Hardening

- [x] **Gitignore Corrected:** `/prisma/migrations/**/migration_lock.toml` rule removed from `.gitignore`.
- [x] **Package Manager Locked:** `"packageManager": "pnpm@11.1.2"` present in `package.json`.
- [x] **Security Headers Configured (`next.config.ts`):**
  - `poweredByHeader: false` configured.
  - `X-Content-Type-Options: nosniff` header active.
  - `X-Frame-Options: DENY` header active.
  - `Referrer-Policy: strict-origin-when-cross-origin` header active.
  - `Permissions-Policy` disabling camera, microphone, geolocation, payment, usb, browsing-topics active.
  - `X-Robots-Tag: noindex, nofollow, noarchive` configured for `/admin` and `/api/*`.
  - `Strict-Transport-Security` configured for production (`NODE_ENV === "production"`).
- [x] **Health Endpoint Hardened (`/api/health`):**
  - Returns minimal JSON (`status: "ok", service: "bike-management-system"`).
  - Sends `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.
  - Exposes zero environment variables, git commits, paths, or secrets.
- [x] **SEO & Site Configuration (`src/lib/site-config.ts`):**
  - `SITE_URL` and `SITE_INDEXING_ENABLED` placeholders added to `.env.example`.
  - `getValidatedSiteUrl()` fails explicitly if indexing is enabled with missing or localhost URL.
- [x] **Robots & Sitemap Route Handlers:**
  - `src/app/robots.ts` generates dynamic `/robots.txt` based on `SITE_INDEXING_ENABLED`.
  - `src/app/sitemap.ts` generates dynamic `/sitemap.xml` listing verified existing public routes (`/`).
  - `/admin` metadata configured with `noindex, nofollow, noarchive`.
- [x] **CI & Dependabot Configuration:**
  - `.github/workflows/ci.yml` created for push/PR to `main` and `develop`.
  - `.github/dependabot.yml` created for weekly npm and GitHub Actions updates.
- [x] **Database Design Document Hardened (`docs/DATABASE_DESIGN.md`):**
  - Circular `Bike.purchaseId` foreign key removed.
  - Relational `OfferBike` and `SellBikeRequestImage` entities defined.
  - Five canonical bike statuses locked (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`).
  - Payment field naming updated (`paidAt` vs `receivedAt`).
  - Keyed HMAC lookup specified for duplicate NID detection (`nidNumberHmac`).

---

## Upcoming Phase Checklists (Phases 1–13)

### Phase 1 — Database Schema & Prisma
- [ ] PostgreSQL connection established via `.env`.
- [ ] Prisma schema models match `docs/DATABASE_DESIGN.md` strictly.
- [ ] Migration created (`prisma migrate dev`) and `migration_lock.toml` tracked in Git.
- [ ] Seed script executes using synthetic data only.

### Phase 2 — Admin Authentication
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
- [ ] Public bike status transitions to `SOLD` upon sale confirmation while keeping payment settlement state independent.

### Phase 7 — Financial Ledgers & Auditing
- [ ] Receivables and payables summary views accurate.
- [ ] Payment receipt generation functional.
- [ ] Void operations recorded with audit reasons (no silent deletions).
- [ ] Redacted `AuditLog` entries generated for all financial mutations.

### Phase 8 — Public Showroom
- [ ] Catalogue page (`/bikes`) with dynamic brand/price/year filtering operational.
- [ ] Bike details page (`/bikes/[id]`) rendering images, specs, and WhatsApp CTA.
- [ ] Schema.org structured data (`Motorcycle`, `Product`, `LocalBusiness`) integrated.
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
- [ ] Customer account registration and phone verification (`CustomerAccount`) operational.
- [ ] Account linking to existing `Customer` records verified.
- [ ] Read-only customer portal for viewing purchases, sales, and dues working.

### Phase 13 — Deployment & Audit
- [ ] Full security audit completed.
- [ ] Production deployment configured with verified HTTPS and headers.
- [ ] Database backup and restore test executed successfully.
