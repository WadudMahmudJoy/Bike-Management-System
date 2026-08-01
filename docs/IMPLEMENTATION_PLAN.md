# Implementation Plan

This document details the 14-phase roadmap for the **Bike Management System** (Sristy-Dristy Bike House).

---

## Completed Phases

### Phase 0 — Foundation and Durable Documentation
**Status: Complete**
- Initialized Next.js application with TypeScript (strict), Tailwind CSS, App Router, `src/` directory.
- Configured ESLint and Prisma 7 foundation configuration (`prisma.config.ts`, `schema.prisma`).
- Installed Zod for runtime schema validation.
- Built minimal homepage placeholder (`/`), admin placeholder (`/admin`), and health endpoint (`/api/health`).
- Created baseline durable documentation set in `docs/`.
- Verified build, typecheck, and lint commands. Committed and pushed to `main` and `develop`.

### Phase 0.5 — Foundation Corrections, Database Design Hardening, Security Baseline, SEO Foundation, and CI
**Status: Complete**
- **Gitignore Correction:** Removed `/prisma/migrations/**/migration_lock.toml` from `.gitignore` so future migration history is tracked.
- **Database Design Hardening:** Revised `docs/DATABASE_DESIGN.md` to eliminate circular foreign keys (`Bike.purchaseId`), replace array fields with relational tables (`OfferBike`, `SellBikeRequestImage`), lock 5 canonical statuses (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`), clarify payment field names (`paidAt` vs `receivedAt`), structure `BikeRequest` budget into `minimumBudget` and `maximumBudget` Decimal fields, and mandate keyed HMAC for duplicate NID lookups.
- **Security Baseline:** Implemented safe HTTP security headers in `next.config.ts` (`poweredByHeader: false`, `nosniff`, `DENY`, `strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Robots-Tag` for admin/API). Added `no-store` cache control to `/api/health`. Divided `docs/SECURITY_REQUIREMENTS.md` into Implemented, Planned, and Production sections.
- **SEO Foundation:** Created `docs/SEO_REQUIREMENTS.md`. Created `src/lib/site-config.ts` with build-safe URL validation and indexing controls (`SITE_INDEXING_ENABLED`). Updated `src/app/layout.tsx` metadata. Created dynamic route handlers `src/app/robots.ts` and `src/app/sitemap.ts`. Updated `/admin` page metadata with `noindex, nofollow, noarchive`.
- **CI Pipeline:** Created `.github/workflows/ci.yml` running lint, typecheck, build, and `pnpm audit`. Added `.github/dependabot.yml` for weekly dependency checks. Added `"packageManager": "pnpm@11.1.2"` to `package.json`.

---

## Upcoming Phases

### Phase 1 — PostgreSQL Development Environment and Prisma Schema
**Status: Next Approved Phase (Requires User Permission)**
- Set up local PostgreSQL development database.
- Define complete Prisma schema based strictly on `docs/DATABASE_DESIGN.md`.
- Create initial migration (`prisma migrate dev`).
- Create seed script with synthetic test data (no real customer data).
- Verify schema matches database design specification.

### Phase 2 — Secure Admin Authentication and Admin Shell
- Build admin login page (`/admin/login`).
- Implement Argon2id password verification and server-side session management (`AdminSession`).
- Implement `HttpOnly`, `Secure`, `SameSite` session cookie handling storing `sessionTokenHash`.
- Build collapsible admin layout with sidebar navigation.
- Implement server-side middleware authorization for `/admin/*` routes.
- Implement login rate limiting and session revocation.

### Phase 3 — Customer Management
- Build Customer CRUD interfaces (create, view, edit, list, filter).
- Implement Bangladesh phone number normalization and duplicate warnings.
- Implement NID lifecycle (`PENDING` -> `SUBMITTED` -> `VERIFIED`).
- Implement AES-256-GCM authenticated encryption for NID and bank accounts.
- Implement HMAC-SHA256 duplicate NID lookup index.
- Implement private object storage for customer document uploads with time-limited signed URLs.

### Phase 4 — Bike Inventory
- Build Bike CRUD interfaces with public status management (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`).
- Implement public bike image gallery upload with ordering and primary photo selection.
- Implement bike condition assessment form (`BikeCondition`).
- Implement bike document storage (`BikeDocument`).
- Implement automated bike status history tracking (`BikeStatusHistory`).

### Phase 5 — Shop Purchase Workflow
- Implement purchase workflow (recording bikes bought from sellers).
- Link purchase to customer (seller) and bike.
- Implement purchase status transitions (`DRAFT` -> `CONFIRMED` -> `COMPLETED`).
- Implement seller payment recording (`PurchasePayment` with `paidAt`, `receiptNumber`).
- Compute seller outstanding payable dynamically server-side.
- Enforce database transactions for multi-record operations.

### Phase 6 — Customer Sale Workflow
- Implement sale workflow (recording bikes sold to buyers).
- Link sale to customer (buyer) and bike.
- Implement sale status transitions (`DRAFT` -> `CONFIRMED` -> `COMPLETED`).
- Implement buyer payment recording (`SalePayment` with `receivedAt`, `receiptNumber`).
- Compute buyer outstanding due dynamically server-side.
- Automatically update bike `publicStatus` to `SOLD` upon sale confirmation while maintaining independent payment settlement state.

### Phase 7 — Payments, Dues, Receipts, and Audit Controls
- Build unified financial management dashboard (receivables vs. payables).
- Implement receipt generation for `SalePayment` and `PurchasePayment`.
- Implement payment voiding workflow with audit reasons (no silent deletions).
- Implement immutable `AuditLog` generation for all financial operations.

### Phase 8 — Public Showroom
- Build public homepage (`/`) with real bike data.
- Build available bike catalogue (`/bikes`) with dynamic filtering and search.
- Build bike detail pages (`/bikes/[id]`) with image galleries, condition reports, Call/WhatsApp CTAs.
- Integrate Schema.org structured data (`Motorcycle` / `Product`).
- Ensure SEO compliance and Core Web Vitals optimization.

### Phase 9 — Sell-Bike Submissions
- Build public "Sell Your Bike" submission form (`/sell-your-bike`) with image upload.
- Build admin review interface (`SellBikeRequest` and `SellBikeRequestImage`).
- Implement status tracking (`NEW` -> `REVIEWED` -> `CONTACTED` -> `PURCHASED` / `REJECTED`).

### Phase 10 — Requested-Bike Workflow
- Build public "Request a Bike" form (`/request-a-bike`) with structured budget ranges (`minimumBudget`, `maximumBudget`).
- Build admin review and matching interface (`BikeRequest`).
- Implement status tracking (`NEW` -> `REVIEWED` -> `MATCHED` -> `CLOSED`).

### Phase 11 — Offers, Enquiries, and Expenses
- Build offer management (`Offer` & `OfferBike`) and public offer display (`/offers`).
- Build general enquiry and inspection booking handlers (`Inquiry`, `InspectionBooking`).
- Build shop operational expense tracking (`Expense`).

### Phase 12 — Optional Customer Account and Customer Portal
- Build customer signup and phone verification (`CustomerAccount`).
- Implement secure account linking to existing `Customer` business records.
- Build customer portal for viewing personal purchases, sales, receipts, and remaining dues.
- Enforce read-only customer permissions over admin-controlled financial records.

### Phase 13 — Security Audit, Complete Testing, Deployment, Backup, and Restore Validation
- Conduct full security audit against `docs/SECURITY_REQUIREMENTS.md`.
- Execute automated end-to-end testing suite (`docs/TESTING_CHECKLIST.md`).
- Validate production build, HTTPS, headers, and environment variables.
- Execute automated database backup and test staging restore procedure.
- Perform final documentation update.

---

## Phase Execution Rules

1. Each phase is strictly bounded and independently verifiable.
2. Each phase is committed separately and pushed after clean verification.
3. Every phase updates `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md`.
4. No phase begins without explicit user approval.
5. **Phase 1 must not begin during Phase 0.5.**
