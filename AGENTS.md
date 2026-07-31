# AGENTS.md — Coding Agent Instructions

This file instructs every AI coding agent (Claude, Gemini, or other) working on this project.

## Before You Begin

1. Read this file (`AGENTS.md`) completely before making any changes.
2. Read all relevant files in the `docs/` directory, especially:
   - `docs/HANDOFF.md` — current state and exact next task
   - `docs/PROJECT_STATUS.md` — what is complete and what is not
   - `docs/IMPLEMENTATION_PLAN.md` — phase order and scope
   - `docs/ARCHITECTURE.md` — system architecture
   - `docs/DATABASE_DESIGN.md` — planned data model
   - `docs/PRODUCT_SPEC.md` — business requirements
   - `docs/SECURITY_REQUIREMENTS.md` — security constraints
   - `docs/SEO_REQUIREMENTS.md` — SEO requirements and guidelines
   - `docs/UI_DESIGN_SYSTEM.md` — design system
   - `docs/DECISIONS.md` — locked decisions
   - `docs/CUSTOMER_ACCOUNT_DECISION.md` — customer account policy
   - `docs/TESTING_CHECKLIST.md` — verification requirements
3. Inspect the existing code instead of assuming its structure.
4. Do not assume unimplemented features exist. Check the code.

## Mandatory Coding & Architecture Rules

### 1. Bounded Phase Workflow
- Work on only one bounded phase at a time as defined in `docs/IMPLEMENTATION_PLAN.md`.
- Do not begin a new phase without explicit user approval.
- Avoid unrelated refactoring. Stay focused on the current phase scope.
- Stop and report actual errors instead of hiding, bypassing, or fabricating success.

### 2. Strict TypeScript & Code Quality
- Use strict TypeScript. Do not disable `strict` mode in `tsconfig.json`.
- Do not use `any` unless technically unavoidable and documented with a comment explaining why.
- Keep files and components focused and reasonably small (prefer under 200 lines per file).
- Validate every server-side input using Zod schemas.

### 3. Architecture Separation
Maintain clear separation between:
- Public UI (customer-facing pages)
- Admin UI (management pages)
- Domain logic (business rules)
- Database access (Prisma queries and transactions)
- Validation (Zod schemas)
- Authentication (login, session management)
- Authorization (permission checks)
- File storage (upload handling, private storage)
- Financial calculations (server-side only)

### 4. Security Baseline Rules
- Enforce authorization on the server for every protected action. Hidden UI controls are for UX only and are never security controls.
- `robots.txt` and `noindex` headers are crawler directives, NOT security controls. Real server authorization is mandatory.
- Never claim planned security controls are implemented when they are not.
- Never weaken security controls or bypass validation merely to make tests pass.
- Sensitive fields (NID numbers, bank account numbers) require authenticated encryption at rest. Duplicate lookup uses keyed HMAC with an external pepper.
- Admin session records store token hashes (`sessionTokenHash`), never raw reusable session tokens.
- Never expose NID numbers, bank account numbers, addresses, phone numbers, financial records, receipts, or private documents on any public page, API, metadata tag, or log.

### 5. Financial Integrity
- Never use JavaScript floating-point arithmetic for money. Use PostgreSQL Decimal-compatible values.
- Calculate all financial totals and outstanding balances server-side. Do not store manually editable remaining balance fields.
- Store every payment as a separate auditable transaction record in an append-only ledger.
- Never silently edit or delete a posted payment. Use explicit void or reversal records with documented reasons.
- Keep public bike display status (`AVAILABLE`, `SOLD`) separate from financial settlement status.
- Use database transactions for multi-record financial workflows.

### 6. SEO & Metadata Rules
- Read `docs/SEO_REQUIREMENTS.md` before working on any public-facing pages.
- Public pages require appropriate dynamic metadata (title, description, canonical URL, Open Graph).
- Private routes (`/admin/*`, `/api/*`) require `noindex, nofollow, noarchive` metadata and HTTP headers.
- Do not generate fake structured data (JSON-LD), fake reviews, fake aggregate ratings, or artificial inventory counts.
- Sitemap entries must contain only canonical, publicly accessible URLs returning HTTP 200. Nonexistent or placeholder routes must never be included in the sitemap.

### 7. Privacy and Git Hygiene
- Never commit:
  - `.env` files or any file containing real credentials
  - Customer documents or NID images
  - Database dumps or backups containing customer data
  - Real customer information in any file
  - Generated secrets, tokens, or keys
  - Migration lock overrides (`migration_lock.toml` should be committed with actual migrations, but `.env` must not)
- Never use real personal information in seeds, tests, or fixtures.
- Never log sensitive data (passwords, tokens, NID numbers, bank accounts).

### 8. Verification & Documentation Updates
- Before claiming any phase is complete, run and confirm passing results for:
  ```bash
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm typecheck
  pnpm build
  pnpm audit --audit-level=high
  ```
- Run relevant tests if they exist. Do not suppress TypeScript or ESLint errors to obtain a false pass.
- After every phase, update:
  - `docs/PROJECT_STATUS.md` — with current state, commit, verification results
  - `docs/HANDOFF.md` — with exact next task for the next agent
- Report in your final response: changed files, commands run, test results, current branch, commit SHA, push result, and any unresolved issues.

## Technology Stack (Locked)

- **Framework**: Next.js with App Router
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Components**: Server Components by default; Client Components only where interactivity is required

Do not introduce:
- Separate backend frameworks (Express, NestJS, Fastify, PHP, Java, Python)
- MongoDB or other NoSQL databases
- State management libraries (Redux, Zustand) unless justified
- UI component libraries unless approved by the user
- Authentication libraries unless approved for the specific phase
- Payment processing libraries unless approved for the specific phase
