# Handoff — For Future Coding Agents

This document provides the necessary context, constraints, and instructions for any future AI coding agent (Claude, Gemini, or other) continuing development on this repository.

---

## Mandatory Initial Step: Read Required Files

Before writing code or editing files, read these documents in full:

1. `AGENTS.md` — Coding rules, architecture separation, financial rules, and security guidelines.
2. `docs/HANDOFF.md` — This file (current state, exact next task, and constraints).
3. `docs/PROJECT_STATUS.md` — Current project state and completed work.
4. `docs/CUSTOMER_MANAGEMENT_DESIGN.md` — Authoritative Phase 3A Customer Management technical specification.
5. `docs/AUTHENTICATION_DESIGN.md` — Authoritative authentication architecture specification.
6. `docs/IMPLEMENTATION_PLAN.md` — 14-phase development roadmap.
7. `docs/ARCHITECTURE.md` — Full-stack system architecture and directory layout.
8. `docs/DATABASE_DESIGN.md` — Authoritative database design specification.
9. `docs/SECURITY_REQUIREMENTS.md` — Security baseline, planned controls, and production requirements.
10. `docs/SEO_REQUIREMENTS.md` — SEO technical requirements and metadata rules.
11. `docs/PRODUCT_SPEC.md` — Complete MVP feature requirements.
12. `docs/DECISIONS.md` — Locked decisions.
13. `docs/CUSTOMER_ACCOUNT_DECISION.md` — Customer account policy and account-linking rules.
14. `docs/TESTING_CHECKLIST.md` — Verification checklist.

---

## Current System Architecture & Database State

- **Monolith Framework:** Next.js 16 App Router full-stack monolith (`src/app/`).
- **Language & Styling:** Strict TypeScript (`tsconfig.json`), Tailwind CSS 4 (`globals.css`).
- **Database & ORM:** PostgreSQL 18 & Prisma 7 (`@prisma/adapter-pg` & `pg.Pool`).
- **Container Environment:** Local PostgreSQL 18 containerized in `compose.yaml` (`bike-postgres`), bound strictly to `127.0.0.1:5434`.
- **Implemented Database Schema:** 27 business entities and 25 enum groups in `prisma/schema.prisma`.
- **Applied Migrations:**
  - `20260801174101_init_dealership_schema`
  - `20260802000215_phase1_integrity_corrections`
  - `20260802042936_phase2_admin_auth_throttling`
- **Implemented Modules:**
  - Secure Admin Authentication Stack (Argon2id, session tokens, login throttling, logout, proxy protection, owner bootstrap CLI).
  - Phase 3A Customer Core Management: Bangladesh phone normalization (`+8801XXXXXXXXX`), Crockford Base32 customer code generation (`CUS-XXXXXXXX`), multi-role management, controlled duplicate phone warnings, server-side confirmation recheck, default `PENDING` NID status, soft-archiving (`isArchived`), masked contact display in list views, full contact display in authenticated detail views, optimistic concurrency control, privacy-sanitized `AuditLog` entries, and premium dark admin UI for `/admin/customers`.
- **Test Suites:**
  - 37-point runtime database integrity test suite (`pnpm db:test-integrity`).
  - 47-point Vitest unit test suite (`pnpm test`).
  - 23-point admin auth database integration test suite (`pnpm test:admin-auth`).
  - 4-point owner CLI non-interactive smoke test (`pnpm test:admin-cli-smoke`).
  - Customer management integration test suite (`pnpm test:customers`).
- **CI Pipeline:** `.github/workflows/ci.yml` includes PostgreSQL 18 service container, Prisma checks, database integrity tests, unit tests, admin auth tests, CLI smoke tests, customer tests (`pnpm test:customers`), lint, typecheck, build, and blocking audit gate.

---

## Locked Decisions & Core Constraints

- **PR Pending Review:** Phase 3A Pull Request `Phase 3A: add customer core management` is created on branch `phase-3/customer-management` targeting `main`. Do not merge the PR until explicit review approval is given.
- **Do Not Rewrite Applied Migrations:** Applied migrations in `prisma/migrations/` must never be edited.
- **Strict Authorization:** Every server action and customer query requires `requireAdmin()` (or `getAuthorizedAdmin()`). Client-provided admin IDs are prohibited.
- **Privacy Policy:** Full contact values, internal notes, NID numbers, bank details, and tokens must NEVER be logged to `AuditLog`, error messages, or console output.
- **Financial Integrity:** Dynamic server-side calculation only. Append-only ledger logic. No floating-point money.

---

## Verification Commands

Before claiming any task or phase is complete, run:

```powershell
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate status
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

---

## Next Planned Task: Phase 3B — Customer Identity & Encryption (Deferred until approval)

Phase 3B will introduce:
1. AES-256-GCM authenticated encryption for NID numbers and bank account details.
2. Keyed HMAC-SHA256 duplicate NID lookup index (`nidNumberHmac`).
3. NID verification lifecycle transitions (`PENDING` -> `SUBMITTED` -> `VERIFIED`).
4. Private object storage integration for customer identity and agreement document uploads.
