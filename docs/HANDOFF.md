# Handoff — For Future Coding Agents

This document provides the necessary context, constraints, and instructions for any future AI coding agent (Claude, Gemini, or other) continuing development on this repository.

---

## Mandatory Initial Step: Read Required Files

Before writing code or editing files, read these documents in full:

1. `AGENTS.md` — Coding rules, architecture separation, financial rules, and security guidelines.
2. `docs/HANDOFF.md` — This file (current state, exact next task, and constraints).
3. `docs/PROJECT_STATUS.md` — Current project state and completed work.
4. `docs/IMPLEMENTATION_PLAN.md` — 14-phase development roadmap.
5. `docs/ARCHITECTURE.md` — Full-stack system architecture and directory layout.
6. `docs/DATABASE_DESIGN.md` — Authoritative database design specification.
7. `docs/SECURITY_REQUIREMENTS.md` — Security baseline, planned controls, and production requirements.
8. `docs/SEO_REQUIREMENTS.md` — SEO technical requirements and metadata rules.
9. `docs/PRODUCT_SPEC.md` — Complete MVP feature requirements.
10. `docs/DECISIONS.md` — Locked decisions.
11. `docs/CUSTOMER_ACCOUNT_DECISION.md` — Customer account policy and account-linking rules.
12. `docs/TESTING_CHECKLIST.md` — Verification checklist.

---

## Current System Architecture & Foundation State

- **Monolith Framework:** Next.js 16 App Router full-stack monolith (`src/app/`).
- **Language & Styling:** Strict TypeScript (`tsconfig.json`), Tailwind CSS 4 (`globals.css`).
- **Database & ORM:** PostgreSQL planned via Prisma 7 (`prisma.config.ts`, `prisma/schema.prisma`). No business models defined yet.
- **Package Manager & Workspace Overrides:** `pnpm` locked via `"packageManager": "pnpm@11.1.2"` in `package.json`. Root overrides in `pnpm-workspace.yaml` (`sharp: 0.35.3`, `postcss: 8.5.25`).
- **Security Audit Gate:** `pnpm audit --audit-level=high` is a mandatory blocking CI check. Pass status: 0 vulnerabilities found.
- **CI Workflow (Phase 0.5.2):** Actions locked to `actions/checkout@v6` (with `persist-credentials: false`), `pnpm/action-setup@v6`, `actions/setup-node@v6`. Node 20 deprecation warning eliminated.
- **Security Baseline:** HTTP headers in `next.config.ts` (`nosniff`, `DENY`, `strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Robots-Tag` on `/admin` and `/api/*`, production HSTS). `no-store` headers on `/api/health`.
- **SEO Baseline:** Site config in `src/lib/site-config.ts` with `SITE_INDEXING_ENABLED` control. Global layout metadata in `layout.tsx`; page canonical metadata in `page.tsx`. Dynamic `/robots.txt` (`robots.ts`) and `/sitemap.xml` (`sitemap.ts` returns `[]` when indexing is disabled). `noindex` on `/admin/page.tsx`.
- **CI & Tooling:** GitHub Actions workflow `.github/workflows/ci.yml` (lint, typecheck, build, prisma validate, blocking audit) and `.github/dependabot.yml`. `.gitignore` corrected to track `/prisma/migrations/`.

---

## Locked Decisions & Core Constraints

- **No Unimplemented Assumptions:** Do not assume authentication, database tables, customer CRUD, bike CRUD, payment processing, or upload handlers exist. Inspect the codebase first.
- **No Circular FKs:** `Purchase.bikeId` is authoritative. `Bike` does NOT store `purchaseId`.
- **Relational Entities:** Use `OfferBike` for offer-bike joins and `SellBikeRequestImage` for sell submission photos. No JSON arrays for relations.
- **Canonical Public Statuses:** `DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`.
- **Financial Calculations:** Dynamic server-side calculation only. Buyer due = `Sale.finalPrice - sum(SalePayment)`. Seller payable = `Purchase.agreedPrice - sum(PurchasePayment)`. No stored editable balances. No JS floating-point arithmetic.
- **Payment Auditing:** Ledger records (`PurchasePayment`, `SalePayment`) are append-only. Void operations (`isVoided = true`, `voidReason`) are required for corrections.
- **NID & Identity Security:** Authenticated AES-256-GCM encryption for NID and bank accounts. Keyed HMAC-SHA256 (`nidNumberHmac`) using an external pepper for duplicate NID lookup. Admin sessions store `sessionTokenHash`.
- **Customer Accounts:** Optional and separate from business records (`Customer` vs `CustomerAccount`).
- **SEO Integrity:** Metadata ownership separated cleanly. No fake structured data, fake reviews, or fake ratings. Sitemap lists canonical public routes only. `robots.txt` is not access control.

---

## Verification Commands

Before claiming any task or phase is complete, run:

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

## Next Task: Phase 1 — PostgreSQL Development Environment and Prisma Schema

When starting Phase 1 (after explicit user approval):
1. Configure local PostgreSQL connection string in `.env` (verify `.env` remains un-tracked).
2. Create Prisma models in `prisma/schema.prisma` matching `docs/DATABASE_DESIGN.md` strictly.
3. Run `npx prisma migrate dev --name init` to generate the initial migration and ensure `migration_lock.toml` is committed.
4. Build `prisma/seed.ts` using synthetic data only.
5. Verify lint, typecheck, build, and database pull/introspect.
6. Update `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md`.

---

**Phase 0.5.2 is complete. Do not begin Phase 1 until the user reviews the report and gives explicit permission.**
