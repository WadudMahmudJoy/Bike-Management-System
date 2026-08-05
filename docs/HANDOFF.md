# Handoff — For Future Coding Agents

This document provides the necessary context, constraints, and instructions for any future AI coding agent (Claude, Gemini, or other) continuing development on this repository.

---

## Mandatory Initial Step: Read Required Files

Before writing code or editing files, read these documents in full:

1. `AGENTS.md` — Coding rules, architecture separation, financial rules, and security guidelines.
2. `docs/HANDOFF.md` — This file (current state, exact next task, and constraints).
3. `docs/PROJECT_STATUS.md` — Current project state and completed work.
4. `docs/SENSITIVE_DATA_ENCRYPTION_DESIGN.md` — Authoritative Phase 3B1 sensitive data encryption and security specification.
5. `docs/CUSTOMER_MANAGEMENT_DESIGN.md` — Authoritative Customer Management technical specification.
6. `docs/AUTHENTICATION_DESIGN.md` — Authoritative authentication architecture specification.
7. `docs/IMPLEMENTATION_PLAN.md` — 14-phase development roadmap.
8. `docs/ARCHITECTURE.md` — Full-stack system architecture and directory layout.
9. `docs/DATABASE_DESIGN.md` — Authoritative database design specification.
10. `docs/SECURITY_REQUIREMENTS.md` — Security baseline, planned controls, and production requirements.
11. `docs/SEO_REQUIREMENTS.md` — SEO technical requirements and metadata rules.
12. `docs/PRODUCT_SPEC.md` — Complete MVP feature requirements.
13. `docs/DECISIONS.md` — Locked decisions.
14. `docs/CUSTOMER_ACCOUNT_DECISION.md` — Customer account policy and account-linking rules.
15. `docs/TESTING_CHECKLIST.md` — Verification checklist.

---

## Current System Architecture & Database State

- **Monolith Framework:** Next.js 16 App Router full-stack monolith (`src/app/`).
- **Language & Styling:** Strict TypeScript (`tsconfig.json`), Tailwind CSS 4 (`globals.css`).
- **Database & ORM:** PostgreSQL 18 & Prisma 7 (`@prisma/adapter-pg` & `pg.Pool`).
- **Container Environment:** Local PostgreSQL 18 containerized in `compose.yaml` (`bike-postgres`), bound strictly to `127.0.0.1:5434`.
- **Implemented Database Schema:** 27 normalized entities in `prisma/schema.prisma`.
- **Applied Migrations:**
  - `20260801174101_init_dealership_schema`
  - `20260802000215_phase1_integrity_corrections`
  - `20260802042936_phase2_admin_auth_throttling`
  - `20260805191700_phase3b1_sensitive_data_invariants`
- **Implemented Modules:**
  - Secure Admin Authentication Stack (Argon2id, session tokens, login throttling, logout, proxy protection, owner bootstrap CLI).
  - Phase 3A Customer Core Management: Bangladesh phone normalization (`+8801XXXXXXXXX`), Crockford Base32 customer code generation (`CUS-XXXXXXXX`), multi-role management, duplicate warnings, optimistic concurrency control, and soft archiving.
  - Phase 3B1 Encrypted Customer Identity & Bank Accounts: Versioned AES-256-GCM authenticated encryption for NID and optional bank account numbers with 12-byte random IVs and 16-byte GCM tags; pre-generated UUID AAD binding context (`bike-management-system|sensitive:v1|PURPOSE|customer:<id>|record:<id>`); independent 64-char hex HMAC-SHA256 duplicate NID lookup key (`nidNumberHmac`); strict NID lifecycle transitions (`PENDING` -> `SUBMITTED` -> `VERIFIED` / `NEEDS_CORRECTION`); password re-authenticated sensitive reveals; dual-key global per-admin reveal rate limiting (`sensitive-reveal:admin:<adminId>`); fail-closed audit logging; server-side masking (`******1234` / `******5678`); strict Zod input boundaries rejecting unrelated fields; client 30-second reveal visibility auto-clear timer & tab-hide listener; and obsidian/graphite dark UI components.
- **Test Suites:**
  - 39-point runtime database integrity test suite (`pnpm db:test-integrity`).
  - 104-point Vitest unit test suite (`pnpm test`).
  - 23-point admin auth database integration test suite (`pnpm test:admin-auth`).
  - 4-point owner CLI non-interactive smoke test (`pnpm test:admin-cli-smoke`).
  - 16-point customer management integration test suite (`pnpm test:customers`).
  - 7-point sensitive data database integration test suite (`pnpm test:sensitive-data`).
- **CI Pipeline:** `.github/workflows/ci.yml` includes PostgreSQL 18 service container, Prisma checks, database integrity tests, unit tests, admin auth tests, CLI smoke tests, customer tests, sensitive data tests (`pnpm test:sensitive-data`), lint, typecheck, build, and blocking audit gate.

---

## Locked Decisions & Core Constraints

- **Phase 3B1 PR Ready for Security Review:** Phase 3B1 is implemented on feature branch `phase-3b1/sensitive-data-encryption` with PR targeting `main`. Do not merge PR without review.
- **Do Not Rewrite Applied Migrations:** Applied migrations in `prisma/migrations/` must never be edited.
- **Strict Authorization:** Every server action and query requires `requireAdmin()` (or `getAuthorizedAdmin()`). Client-provided admin IDs are prohibited.
- **Privacy Policy:** Plaintext sensitive values (NIDs, bank account numbers), HMACs, keys, IVs, tags, or passwords must NEVER be logged to `AuditLog`, error messages, or console output.
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
pnpm test:sensitive-data
pnpm lint
pnpm typecheck
pnpm build
pnpm audit --audit-level=high
pnpm exec prisma migrate diff --exit-code --from-config-datasource --to-schema prisma/schema.prisma
git diff --check
```

---

## Next Planned Task: Phase 3B2 — Customer Document Storage & Verification (Deferred until approval)

Phase 3B2 will introduce private object storage integration for customer identity documents (NID photos/scans) and agreement documents, signed access URLs, document upload security controls, and admin verification workflow.
