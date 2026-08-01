# Project Status

## Current Phase

**Phase 0.5.2 — GitHub Actions Runtime Correction**

## Status

**Complete** — All Phase 0.5.2 GitHub Actions runtime updates (`v6`) and checkout security settings (`persist-credentials: false`) have been implemented and verified in CI.

---

## Completed Work (Phase 0 through Phase 0.5.2)

### 1. Application & Tooling Foundation
- Next.js 16.2.12 App Router initialized with TypeScript (strict mode), Tailwind CSS 4, ESLint 9, `src/` directory.
- Prisma 7 configured (`prisma.config.ts`, `prisma/schema.prisma`).
- Zod installed for payload validation.
- Package manager locked in `package.json` (`"packageManager": "pnpm@11.1.2"`).
- pnpm build script permissions configured in `pnpm-workspace.yaml` (`allowBuilds`).

### 2. Dependency Overrides & Security Gate (`pnpm-workspace.yaml` & `.github/workflows/ci.yml`)
- **Root Workspace Overrides (`pnpm-workspace.yaml`):** Configured root overrides for `sharp` (`0.35.3`) and `postcss` (`8.5.25`).
- **Verified Dependency Resolution:** Single resolved version of `sharp` (`0.35.3`) and `postcss` (`8.5.25`).
- **Blocking Security Gate:** `pnpm audit --audit-level=high` is a mandatory blocking CI check. Zero vulnerabilities found.
- **GitHub Actions Runtime Update (Phase 0.5.2):** Actions updated to `actions/checkout@v6`, `pnpm/action-setup@v6`, `actions/setup-node@v6` with `persist-credentials: false` on checkout. Node 20 runner deprecation warning eliminated.
- **Environment Telemetry:** `NEXT_TELEMETRY_DISABLED: "1"` set in CI environment.
- **Prisma CI Step:** `pnpm exec prisma validate` step in CI using synthetic placeholder `DATABASE_URL`.

### 3. SEO Metadata Ownership Correction (`layout.tsx`, `page.tsx`, `sitemap.ts`)
- **Metadata Ownership Separation:** Root layout defines global defaults only; `page.tsx` exports page-specific canonical links (`alternates: { canonical: "/" }`) and Open Graph URLs (`openGraph: { url: "/" }`).
- **Sitemap Protection (`src/app/sitemap.ts`):** Returns `[]` when `SITE_INDEXING_ENABLED` is `false`.

### 4. Database Design Hardening (`docs/DATABASE_DESIGN.md`)
- Authoritative database specification locked (`Purchase.bikeId` authoritative, `OfferBike` and `SellBikeRequestImage` relational entities, 5 canonical statuses `DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`, keyed HMAC NID lookup).

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
| CI Pipeline (`gh run list`) | ✅ Pass | Run `30710267111` succeeded in 35s with 0 deprecation warnings |
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
