# Handoff — For Future Coding Agents

This document provides the context needed by any future Claude, Gemini, or other AI coding agent continuing development on this project.

## Read These Files First

Before making any changes, read:

1. `AGENTS.md` — Mandatory coding rules and constraints
2. `docs/HANDOFF.md` — This file (current state and next task)
3. `docs/PROJECT_STATUS.md` — What is complete and what is not
4. `docs/IMPLEMENTATION_PLAN.md` — Phase order and scope
5. `docs/ARCHITECTURE.md` — System architecture
6. `docs/DATABASE_DESIGN.md` — Planned data model (not yet implemented)
7. `docs/PRODUCT_SPEC.md` — Business requirements
8. `docs/SECURITY_REQUIREMENTS.md` — Security constraints
9. `docs/DECISIONS.md` — Locked decisions
10. `docs/CUSTOMER_ACCOUNT_DECISION.md` — Customer account policy

## Current Architecture

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL via Prisma (configured, no models defined)
- **Validation**: Zod (installed, not yet used)
- **Package Manager**: pnpm
- **Structure**: `src/app/` directory with App Router

## Locked Business Decisions

- TypeScript full-stack monolith (no separate backend)
- PostgreSQL with Prisma ORM (no MongoDB)
- Optional customer accounts (separate from business records)
- NID pending workflow (required for final transaction, not for creation)
- Append-only payment ledger (void/reversal for corrections)
- Separate purchase and sale payment domains
- Separate public bike status and financial status
- No live chat in MVP
- Website forms + WhatsApp as primary communication
- No floating-point money (use Decimal types)

## Current Phase

**Phase 0 — Foundation and Durable Documentation** is complete.

## Last Completed Task

Phase 0: Application foundation initialized, all documentation created, verification passed (lint, typecheck, build), committed and pushed to GitHub.

## Exact Next Task

**Phase 1 — PostgreSQL Development Environment and Prisma Schema**

Phase 1 scope:
1. Set up PostgreSQL development database
2. Define complete Prisma schema based on `docs/DATABASE_DESIGN.md`
3. Create initial migration
4. Create seed script with synthetic test data (no real customer data)
5. Verify schema matches the design document
6. Update `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md`
7. Commit and push

## Commands Required for Verification

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

## Known Risks

- Prisma schema in Phase 1 must match `docs/DATABASE_DESIGN.md` exactly
- Financial Decimal types must be verified in the schema
- Customer phone normalization logic must be planned before schema
- NID encryption strategy must be decided before implementing CustomerIdentity
- File storage strategy (local vs cloud) must be decided before implementing uploads

## Important Constraints

- Do not assume any business modules exist — they do not
- Do not assume authentication exists — it does not
- Do not assume database tables exist — only the Prisma datasource is configured
- Do not install libraries beyond what is needed for the current phase
- Do not skip phases or combine phases without user approval
- Run all verification commands before claiming completion

---

**Phase 0 is complete. Do not begin Phase 1 until the user reviews the report and gives explicit permission.**
