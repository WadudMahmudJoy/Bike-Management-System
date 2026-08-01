# Bike Management System (Sristy-Dristy Bike House)

A production-grade pre-owned motorcycle dealership management system and public showroom website.

- **Customer-Facing Name:** Sristy-Dristy Bike House
- **Legal Business Name:** Sristy-Dristy Enterprise
- **Repository:** `https://github.com/WadudMahmudJoy/Bike-Management-System`

---

## Technology Stack

- **Framework:** Next.js 16 (App Router full-stack monolith)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **Database & ORM:** PostgreSQL & Prisma 7
- **Validation:** Zod
- **Package Manager:** pnpm 11 (`packageManager: pnpm@11.1.2`, root overrides in `pnpm-workspace.yaml`)
- **Linting:** ESLint 9

---

## Project Status

- **Phase 0 (Foundation):** Complete
- **Phase 0.5 (Baseline & Hardening):** Complete
- **Phase 0.5.1 (Dependency Security Gate & SEO Metadata Correction):** Complete
- **Phase 1 (PostgreSQL & Prisma Schema):** Next Approved Phase (Requires User Permission)

---

## Verification Commands

To verify the codebase before committing:

```bash
pnpm install --frozen-lockfile
pnpm why sharp
pnpm why postcss
pnpm lint
pnpm typecheck
pnpm build
pnpm exec prisma validate
pnpm audit --audit-level=high
git diff --check
```

---

## Key Architecture & Security Decisions

1. **Monolith Architecture:** Next.js App Router full-stack monolith. No separate Express/NestJS backend.
2. **Blocking Security Gate:** `pnpm audit --audit-level=high` is enforced as a mandatory blocking check in CI. `continue-on-error` is prohibited.
3. **Workspace Overrides:** Transitive dependencies (`sharp`, `postcss`) are overridden in `pnpm-workspace.yaml`.
4. **Metadata Ownership Separation:** Root layout (`layout.tsx`) defines global metadata defaults. Page components (`page.tsx`) define canonical URLs and page Open Graph URLs.
5. **No Floating-Point Money:** All financial values use PostgreSQL Decimal-compatible types. Financial totals are calculated server-side.
6. **Append-Only Payment Ledger:** Payments cannot be silently edited or deleted. Void operations are required for corrections.
7. **Authoritative Relations:** `Purchase.bikeId` is authoritative; `Bike` does not store duplicate foreign keys. Relational join entities (`OfferBike`, `SellBikeRequestImage`) replace JSON arrays.
8. **Sensitive Data Protection:** AES-256-GCM encryption for raw NID/bank values. Keyed HMAC-SHA256 index (`nidNumberHmac`) using an external pepper for duplicate lookups.

---

## License & Ownership

© 2026 Sristy-Dristy Enterprise. All rights reserved.
