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

## Current System Architecture & Database State

- **Monolith Framework:** Next.js 16 App Router full-stack monolith (`src/app/`).
- **Language & Styling:** Strict TypeScript (`tsconfig.json`), Tailwind CSS 4 (`globals.css`).
- **Database & ORM:** PostgreSQL 18 & Prisma 7 (`@prisma/adapter-pg` & `pg.Pool`).
- **Container Environment:** Local PostgreSQL 18 containerized in `compose.yaml` (`bike-postgres`), bound to `127.0.0.1:5434`, with volume mounted at `/var/lib/postgresql` and committed initializer `docker/postgres/init/01-create-shadow-database.sh`.
- **Implemented Database Schema:** 26 business entities and 25 enum groups in `prisma/schema.prisma` generated to `src/generated/prisma`, including `AdminUser.normalizedEmail`.
- **Applied Migrations:** `20260801174101_init_dealership_schema` and `20260802000215_phase1_integrity_corrections` containing custom CHECK constraints, partial unique cover index `idx_bike_image_cover`, and engine-level immutability triggers (`PurchasePayment`, `SalePayment`, `Expense`, `AuditLog`, `BikeStatusHistory`).
- **Database Driver Singleton:** Server-only `src/lib/prisma.ts` singleton importing `@prisma/adapter-pg`.
- **Seed Foundation:** Idempotent `prisma/seed.ts` populating non-sensitive `ShopSetting` entries (`Sristy-Dristy Bike House` / `Sristy-Dristy Enterprise`).
- **Runtime Integrity Test Suite:** 37-point runtime test suite (`scripts/test-database-integrity.ts`, executable via `pnpm db:test-integrity`).
- **CI Pipeline:** `.github/workflows/ci.yml` includes a PostgreSQL 18 service container, `prisma validate`, `prisma generate`, `prisma migrate deploy`, `prisma migrate status`, `prisma migrate diff`, double-pass `prisma db seed`, `pnpm db:test-integrity`, lint, typecheck, build, and blocking audit gate.

---

## Locked Decisions & Core Constraints

- **Do Not Rewrite Applied Migrations:** The migrations in `prisma/migrations/` are applied and tracked in Git. Do not rewrite, modify, or delete applied migrations. Future schema modifications must be executed via new migrations (`prisma migrate dev --name <name>`).
- **No Unimplemented Assumptions:** Do not assume authentication UI, admin login handlers, customer CRUD, bike CRUD, or payment processing logic exist. Inspect the codebase first.
- **No Circular FKs:** `Purchase.bikeId` is authoritative. `Bike` does NOT store `purchaseId`.
- **Relational Entities:** `OfferBike` and `SellBikeRequestImage` replace JSON arrays.
- **Canonical Public Statuses:** `DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`.
- **Financial Calculations:** Dynamic server-side calculation only. Buyer due = `Sale.finalPrice - sum(SalePayment)`. Seller payable = `Purchase.agreedPrice - sum(PurchasePayment)`. No stored editable balances. No JS floating-point arithmetic.
- **Payment & Expense Auditing:** Ledger records (`PurchasePayment`, `SalePayment`, `Expense`) are append-only and enforced by PostgreSQL triggers. Void operations (`isVoided = true`, `voidReason`) are required for corrections.

---

## Verification Commands

Before claiming any task or phase is complete, run:

```powershell
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

---

## Next Task: Phase 2 — Admin Authentication, Session Management, Security Middleware, and Admin Shell Layout

When starting Phase 2 (after explicit user approval and PR #1 review):
1. Implement Argon2id password hashing routines for admin credentials.
2. Build admin login API endpoint and Server Actions.
3. Configure `HttpOnly`, `Secure`, `SameSite` cookies storing session tokens.
4. Store SHA-256 session token hashes (`sessionTokenHash`) in `AdminSession`.
5. Implement Next.js server middleware for `/admin/*` route authorization.
6. Create admin shell layout and session context.
7. Update `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md`.

---

**Phase 1.1 is complete on feature branch `phase-1/postgres-prisma-schema`. Do not merge PR #1. Do not begin Phase 2 until the user reviews the PR and gives explicit permission.**
