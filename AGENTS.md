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
   - `docs/UI_DESIGN_SYSTEM.md` — design system
   - `docs/DECISIONS.md` — locked decisions
   - `docs/CUSTOMER_ACCOUNT_DECISION.md` — customer account policy
   - `docs/TESTING_CHECKLIST.md` — verification requirements
3. Inspect the existing code instead of assuming its structure.
4. Do not assume unimplemented features exist. Check the code.

## Work Process

5. Work on only one bounded phase at a time as defined in `docs/IMPLEMENTATION_PLAN.md`.
6. Do not begin a new phase without explicit user approval.
7. Avoid unrelated refactoring. Stay focused on the current phase scope.
8. Stop and report actual errors instead of hiding, bypassing, or fabricating success.

## Code Quality

9. Use strict TypeScript. Do not disable `strict` mode in `tsconfig.json`.
10. Do not use `any` unless technically unavoidable and documented with a comment explaining why.
11. Keep files and components focused and reasonably small (prefer under 200 lines per file).
12. Validate every server-side input using Zod schemas.

## Architecture Separation

13. Maintain clear separation between:
    - Public UI (customer-facing pages)
    - Admin UI (management pages)
    - Domain logic (business rules)
    - Database access (Prisma queries and transactions)
    - Validation (Zod schemas)
    - Authentication (login, session management)
    - Authorization (permission checks)
    - File storage (upload handling, private storage)
    - Financial calculations (server-side only)

## Security

14. Enforce authorization on the server, not only through hidden UI controls.
15. Never expose NID numbers, bank account numbers, addresses, phone numbers, financial records, receipts, or private documents on any public page or API.
16. Never use JavaScript floating-point arithmetic for money. Use PostgreSQL Decimal-compatible values.
17. Store every payment as a separate auditable transaction record.
18. Never silently edit or delete a posted payment. Use reversal or void records for financial corrections.
19. Keep public bike display status separate from financial-settlement status.
20. Use database transactions for multi-record financial workflows.

## Privacy and Git Hygiene

21. Never commit:
    - `.env` files or any file containing real credentials
    - Customer documents or NID images
    - Database dumps or backups containing customer data
    - Real customer information in any file
    - Generated secrets, tokens, or keys
22. Never use real personal information in seeds, tests, or fixtures.
23. Never log sensitive data (passwords, tokens, NID numbers, bank accounts).

## Verification

24. Before claiming any phase is complete, run and confirm passing results for:
    ```
    pnpm lint
    pnpm typecheck
    pnpm build
    ```
25. Run relevant tests if they exist.
26. Do not suppress TypeScript or ESLint errors to obtain a false pass.

## Documentation Updates

27. After every phase, update:
    - `docs/PROJECT_STATUS.md` — with current state, commit, verification results
    - `docs/HANDOFF.md` — with exact next task for the next agent
28. Report in your final response:
    - Changed files
    - Commands run
    - Test results
    - Current branch
    - Commit SHA
    - Push result
    - Any unresolved issue

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
