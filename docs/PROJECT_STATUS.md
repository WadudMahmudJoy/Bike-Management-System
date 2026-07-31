# Project Status

## Current Phase

**Phase 0.5 — Foundation Corrections, Database Design Hardening, Security Baseline, SEO Foundation, and CI**

## Status

**Complete** — All Phase 0.5 deliverables have been implemented, hardened, and verified.

---

## Completed Work (Phase 0 & Phase 0.5)

### 1. Application & Tooling Foundation
- Next.js 16.2.12 App Router initialized with TypeScript (strict mode), Tailwind CSS 4, ESLint 9, `src/` directory.
- Prisma 7 configured (`prisma.config.ts`, `prisma/schema.prisma`).
- Zod installed for payload validation.
- Package manager locked in `package.json` (`"packageManager": "pnpm@11.1.2"`).
- pnpm build script permissions configured in `pnpm-workspace.yaml` (`allowBuilds`).

### 2. Git & Repository Correction
- `.gitignore` updated: Removed exclusion of `/prisma/migrations/**/migration_lock.toml` so future Prisma migration history is tracked.
- Continued exclusion of `.env` files, customer NID images, private uploads, database dumps, and generated secrets.

### 3. Database Design Hardening (`docs/DATABASE_DESIGN.md`)
- Authoritative specification revised:
  - Removed circular foreign key `Bike.purchaseId` (relationship is authoritative via `Purchase.bikeId`).
  - Replaced array fields with relational tables: `OfferBike` (unique `(offerId, bikeId)`) and `SellBikeRequestImage` (display ordering, timestamp, clean deletion).
  - Locked 5 canonical public bike inventory statuses: `DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`.
  - Clarified payment field naming: `PurchasePayment` (money out to seller) uses `paidAt` and `createdByAdminId`; `SalePayment` (money in from buyer) uses `receivedAt` and `receivedByAdminId`.
  - Structured `BikeRequest` budget into explicit `minimumBudget` and `maximumBudget` Decimal fields.
  - Specified keyed HMAC (`nidNumberHmac`) using an external server pepper for duplicate NID detection.
  - Specified session token hashing (`sessionTokenHash`) for `AdminSession`.

### 4. Security Baseline (`docs/SECURITY_REQUIREMENTS.md` & `next.config.ts`)
- HTTP Security Headers configured in `next.config.ts`: `poweredByHeader: false`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, restrictive `Permissions-Policy`, `X-Robots-Tag: noindex, nofollow, noarchive` for `/admin` and `/api/*`, production HSTS (`max-age=63072000`).
- `/api/health` hardened with `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` and minimal JSON response.
- `docs/SECURITY_REQUIREMENTS.md` divided into Implemented (Phase 0.5), Planned (Later Phases), and Production Required controls.

### 5. SEO Foundation (`docs/SEO_REQUIREMENTS.md` & Metadata Routes)
- Created `docs/SEO_REQUIREMENTS.md` technical guidelines.
- Created `src/lib/site-config.ts` providing build-safe site configuration and indexing control (`SITE_INDEXING_ENABLED`). Fails boot explicitly if indexing is enabled with localhost or missing URL.
- Enhanced `src/app/layout.tsx` metadata with Metadata API, Open Graph, Twitter cards, canonical link, and title template.
- Created dynamic route handlers: `src/app/robots.ts` (`/robots.txt`) and `src/app/sitemap.ts` (`/sitemap.xml`).
- Configured `/admin` placeholder page metadata with `noindex, nofollow, noarchive`.

### 6. Continuous Integration & Dependabot
- Created `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm audit`.
- Created `.github/dependabot.yml` for weekly npm and GitHub Actions dependency updates.

---

## Verification Summary

| Verification Step | Result | Command / Details |
|---|---|---|
| `pnpm lint` | ✅ Pass | ESLint 9 clean |
| `pnpm typecheck` | ✅ Pass | `tsc --noEmit` clean |
| `pnpm build` | ✅ Pass | Next.js production build clean |
| `pnpm audit` | ⚠️ Report | Transitive advisories inside `next@16.2.12` (`sharp` & `postcss`); `pnpm.overrides` applied |
| `git diff --check` | ✅ Pass | Clean whitespace & formatting |
| Environment Check | ✅ Pass | Default indexing disabled (`SITE_INDEXING_ENABLED="false"`) |
| Git Hygiene | ✅ Pass | No `.env`, secrets, or migration locks incorrectly ignored |

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
