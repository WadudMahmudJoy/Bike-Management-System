# Project Status

## Current Phase

**PHASE 3B1 — Encrypted Customer Identity and Optional Bank-Account Management Foundation (Implementation Completed on Branch `phase-3b1/sensitive-data-encryption`)**

## Status

**Phase 3B1 implementation is complete and ready for security review on feature branch `phase-3b1/sensitive-data-encryption` with a Pull Request targeting `main`.**

### Key Phase 3B1 Capabilities

1. **Reassessed Migration & Database Invariants (`20260805191700_phase3b1_sensitive_data_invariants`):**
   - Forward-only SQL migration with fail-fast PostgreSQL compatibility assertions (`DO $$ ... $$;`).
   - `CustomerIdentity.keyVersion` changed from `Int @default(1)` to nullable `Int?`. Unpopulated `PENDING` identities normalized (`UPDATE "CustomerIdentity" SET "keyVersion" = NULL WHERE "nidStatus" = 'PENDING';`).
   - `PENDING` status requires ALL sensitive fields (`encryptedNidNumber`, `encryptionIv`, `authTag`, `keyVersion`, `nidNumberHmac`, `lastFour`, `submittedAt`, `verifiedAt`, `verifiedByAdminId`) to be `NULL`.
   - Populated non-`PENDING` status requires complete 7-field encryption/HMAC bundle and 64-character lowercase hex HMAC format check (`nidNumberHmac ~ '^[a-f0-9]{64}$'`).
   - `CustomerBankAccount` requires complete 5-field encryption bundle (`encryptedAccountNumber`, `encryptionIv`, `authTag`, `keyVersion`, `accountNumberLastFour`) to be `NOT NULL` on every row.
   - `lastFour` and `accountNumberLastFour` check constraints require exactly 4 ASCII digits (`^[0-9]{4}$`).

2. **Pre-Generated Record ID for Encryption Context (AAD Binding):**
   - Server generates UUID `const bankAccountId = crypto.randomUUID()` before encryption to construct canonical AAD binding (`bike-management-system|sensitive:v1|CUSTOMER_BANK_ACCOUNT_NUMBER|customer:<customerId>|record:<bankAccountId>`) and inserts record in one database transaction.
   - Missing `CustomerIdentity` is treated as an integrity failure; fails closed with generic error (`SENSITIVE_DATA_UNAVAILABLE`).

3. **AES-256-GCM Encryption & Independent HMAC-SHA256 Lookup:**
   - Versioned AES-256-GCM authenticated encryption using 32-byte Base64 keys (`SENSITIVE_DATA_ENCRYPTION_KEY_V1`), 12-byte random IVs per operation, and 16-byte GCM auth tags.
   - Independent 32-byte Base64 lookup key (`SENSITIVE_DATA_LOOKUP_HMAC_KEY`) generates deterministic 64-char hex HMAC (`nidNumberHmac`). Hard-blocks duplicate NIDs across active and archived customers with safe error. HMAC values are strictly excluded from DTOs, actions, UI, and audit logs.

4. **Password Re-Authentication & Dual-Key Global Reveal Rate Limiting:**
   - Plaintext reveal requires active admin session + current admin Argon2id password verification.
   - Dual reveal throttle tracks primary global key (`sensitive-reveal:admin:<adminId>`) and network key (`sensitive-reveal:admin-ip:<adminId>:<clientIp>`).
   - 5 failures within 15 minutes blocks reveal access for 15 minutes. Either blocked key rejects reveal request. Distributed-IP attempts are blocked globally.
   - Reveal throttle remains strictly isolated from normal login throttle.

5. **Fail-Closed Audit Logging & Strict Privacy Redaction:**
   - Password verify -> Decrypt -> Safe `AuditLog` write -> Plaintext return. If audit insertion fails, reveal operation aborts immediately and returns ZERO plaintext.
   - Scanned `AuditLog` rows confirm ZERO NID, bank account numbers, last-four, HMAC, ciphertext, IV, tag, password, or key values are written.

6. **Input Boundaries & Rejected Fields:**
   - Mutation Zod schemas use strict object validation (`.strict()`). Unexpected fields (`routingNumber`, `mobileBankingProvider`, `mobileBankingNumber`, `isDefault`, `encryptedAccountNumber`, `encryptionIv`, `authTag`, `keyVersion`, `nidNumberHmac`, `lastFour`, `adminId`) are strictly rejected.

7. **Client Component Reveal Visibility Auto-Clear:**
   - `SensitiveRevealModal` exposes plaintext in requesting component for maximum 30 seconds.
   - Auto-clears immediately on 30s countdown expiry, "Hide now" click, tab-hide (`visibilitychange`), or component unmount. No copy-to-clipboard button.

8. **Comprehensive Verification Pipeline:**
   - 39-point runtime database integrity test suite (`pnpm db:test-integrity`).
   - 104-point Vitest unit test suite (`pnpm test`).
   - 23-point admin auth database integration test suite (`pnpm test:admin-auth`).
   - 4-point owner CLI non-interactive smoke test (`pnpm test:admin-cli-smoke`).
   - 16-point customer management integration test suite (`pnpm test:customers`).
   - 7-point sensitive data database integration test suite (`pnpm test:sensitive-data`).

---

## Completed Work (Phases 0 through 3B1)

### 1. Application & Tooling Foundation
- Next.js 16.2.12 App Router initialized with TypeScript (strict mode), Tailwind CSS 4, ESLint 9, `src/` directory.
- Prisma 7 configured with `@prisma/adapter-pg` driver adapter (`prisma.config.ts`, `prisma/schema.prisma`).
- Zod installed for payload validation.
- Package manager locked in `package.json` (`"packageManager": "pnpm@11.1.2"`).

### 2. Local PostgreSQL 18 Container Environment (`compose.yaml`)
- Containerized PostgreSQL 18 (`postgres:18-alpine`) bound strictly to `127.0.0.1:5434`.

### 3. Complete Prisma 7 Data Model & Schema State
- Implemented 27 normalized entities in `prisma/schema.prisma`.

### 4. Database Migrations
- `20260801174101_init_dealership_schema`
- `20260802000215_phase1_integrity_corrections`
- `20260802042936_phase2_admin_auth_throttling`
- `20260805191700_phase3b1_sensitive_data_invariants`

### 5. Secure Modules & Infrastructure
- Secure Admin Authentication Stack.
- Phase 3A Customer Core Management.
- Phase 3B1 Encrypted Customer Identity & Bank Accounts Foundation.

---

## Verification Summary

| Verification Step | Result | Command / Details |
|---|---|---|
| Compose Config | ✅ Pass | `docker compose config` valid |
| PostgreSQL Container | ✅ Pass | Container `bike-postgres` healthy on `127.0.0.1:5434` |
| Prisma Schema Validate | ✅ Pass | `pnpm exec prisma validate` -> Schema valid 🚀 |
| Prisma Client Generate | ✅ Pass | `pnpm exec prisma generate` -> Output to `src/generated/prisma` |
| Migration Status | ✅ Pass | `pnpm exec prisma migrate status` -> Up to date |
| Schema Drift Check | ✅ Pass | `pnpm exec prisma migrate diff` -> 0 differences detected |
| Runtime Integrity Tests | ✅ Pass | `pnpm db:test-integrity` -> ALL 39 TESTS PASSED CLEANLY |
| Unit Tests (Vitest) | ✅ Pass | `pnpm test` -> 104 / 104 PASSED CLEANLY |
| Admin Auth Integration Tests | ✅ Pass | `pnpm test:admin-auth` -> ALL 23 TESTS PASSED CLEANLY |
| Admin CLI Smoke Test | ✅ Pass | `pnpm test:admin-cli-smoke` -> ALL 4 TESTS PASSED CLEANLY |
| Customer Integration Tests | ✅ Pass | `pnpm test:customers` -> ALL PASSED CLEANLY |
| Sensitive Data Integration Tests | ✅ Pass | `pnpm test:sensitive-data` -> ALL 7 STEPS PASSED CLEANLY |
| ESLint | ✅ Pass | `pnpm lint` -> 0 errors, 0 warnings |
| Typecheck | ✅ Pass | `pnpm typecheck` (`tsc --noEmit`) -> 0 errors |
| Next.js Build | ✅ Pass | `pnpm build` -> Production build clean |
| Security Audit | ✅ Pass | `pnpm audit --audit-level=high` -> 0 vulnerabilities |
| Git Diff Check | ✅ Pass | `git diff --check` -> Clean formatting |

---

## Current Branch & Git State

- **Branch:** `phase-3b1/sensitive-data-encryption`
- **Working Tree:** Clean
- **Pull Request:** Target `main` (Unmerged, pending security review)
- **Phase 3B2:** ❌ Not started (requires explicit user approval)
