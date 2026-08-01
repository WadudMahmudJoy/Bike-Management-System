# Project Status

## Current Phase

**Phase 0.5.1 — Dependency Security Gate and SEO Metadata Correction**

## Status

**Complete** — All Phase 0.5.1 security gate, workspace override, and metadata ownership corrections have been implemented and verified.

---

## Completed Work (Phase 0, Phase 0.5 & Phase 0.5.1)

### 1. Application & Tooling Foundation
- Next.js 16.2.12 App Router initialized with TypeScript (strict mode), Tailwind CSS 4, ESLint 9, `src/` directory.
- Prisma 7 configured (`prisma.config.ts`, `prisma/schema.prisma`).
- Zod installed for payload validation.
- Package manager locked in `package.json` (`"packageManager": "pnpm@11.1.2"`).
- pnpm build script permissions configured in `pnpm-workspace.yaml` (`allowBuilds`).

### 2. Dependency Overrides & Security Gate (`pnpm-workspace.yaml` & `.github/workflows/ci.yml`)
- **Root Workspace Overrides (`pnpm-workspace.yaml`):** Configured root overrides for `sharp` (`0.35.3`) and `postcss` (`8.5.25`). Removed `pnpm.overrides` and direct unused `devDependencies` from `package.json`.
- **Verified Dependency Resolution:**
  - `pnpm why sharp` confirms single resolved version `0.35.3` (no version < 0.35.0 remains).
  - `pnpm why postcss` confirms single resolved version `8.5.25` (no version <= 8.5.17 remains).
- **Blocking Security Gate:** Removed `continue-on-error: true` from `.github/workflows/ci.yml`. The security audit step (`pnpm audit --audit-level=high`) acts as a mandatory blocking CI check.
- **Environment Telemetry:** Added `NEXT_TELEMETRY_DISABLED: "1"` to CI environment.
- **Prisma CI Step:** Added `pnpm exec prisma validate` step in CI using synthetic placeholder `DATABASE_URL`.

### 3. SEO Metadata Ownership Correction (`layout.tsx`, `page.tsx`, `sitemap.ts`)
- **Metadata Ownership Separation:**
  - `src/app/layout.tsx`: Defines global defaults only (`metadataBase`, title template, default title, description, application name, robots, OG siteName, OG type). Removed page-specific `alternates.canonical` and `openGraph.url`.
  - `src/app/page.tsx`: Exports homepage-specific metadata containing `alternates: { canonical: "/" }` and `openGraph: { url: "/" }`.
- **Sitemap Protection (`src/app/sitemap.ts`):** Returns an empty array `[]` when `SITE_INDEXING_ENABLED` is `false`, preventing localhost URLs from being published in `/sitemap.xml`.

### 4. Database Design Hardening (`docs/DATABASE_DESIGN.md`)
- Authoritative specification revised:
  - Removed circular foreign key `Bike.purchaseId` (relationship is authoritative via `Purchase.bikeId`).
  - Replaced array fields with relational tables: `OfferBike` (unique `(offerId, bikeId)`) and `SellBikeRequestImage` (display ordering, timestamp, clean deletion).
  - Locked 5 canonical public bike inventory statuses: `DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`.
  - Clarified payment field naming: `PurchasePayment` (money out to seller) uses `paidAt` and `createdByAdminId`; `SalePayment` (money in from buyer) uses `receivedAt` and `receivedByAdminId`.
  - Structured `BikeRequest` budget into explicit `minimumBudget` and `maximumBudget` Decimal fields.
  - Specified keyed HMAC (`nidNumberHmac`) using an external server pepper for duplicate NID detection.
  - Specified session token hashing (`sessionTokenHash`) for `AdminSession`.

---

## Verification Summary

| Verification Step | Result | Command / Details |
|---|---|---|
| `pnpm install --frozen-lockfile` | ✅ Pass | Dependencies synchronized cleanly |
| `pnpm why sharp` | ✅ Pass | Single version `0.35.3` resolved |
| `pnpm why postcss` | ✅ Pass | Single version `8.5.25` resolved |
| `pnpm lint` | ✅ Pass | ESLint 9 clean |
| `pnpm typecheck` | ✅ Pass | `tsc --noEmit` clean |
| `pnpm build` | ✅ Pass | Next.js production build clean |
| `pnpm exec prisma validate` | ✅ Pass | Schema validation passed |
| `pnpm audit --audit-level=high` | ✅ Pass | `No known vulnerabilities found` (0 vulnerabilities, exit code 0) |
| `git diff --check` | ✅ Pass | Clean whitespace & formatting |

---

## Current Branch & Git State

- **Branch:** `develop`
- **Working Tree:** Clean (0 untracked / modified files)

---

## Known Limitations

- No database connection (PostgreSQL setup and schema migrations are Phase 1).
- No Prisma business models created yet (intentional — Phase 1).
- No authentication or authorization logic active (Phase 2).
- No business CRUD modules or upload handlers implemented.

---

## Next Approved Phase

**Phase 1 — PostgreSQL Development Environment and Prisma Schema**

> **Explicit Requirement:** Phase 1 must NOT begin until the user reviews this report and gives explicit permission.
