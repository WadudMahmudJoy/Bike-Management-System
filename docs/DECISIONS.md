# Architecture and Product Decisions

This document logs all authoritative architectural and product decisions for the **Bike Management System** (Sristy-Dristy Bike House).

---

## Initial Phase 0 Decisions (2026-08-01)

### 2026-08-01: TypeScript Full-Stack Monolith
- **Decision:** Single Next.js repository with TypeScript for both frontend and backend.
- **Rationale:** Reduces deployment complexity, shares types between client and server, single codebase for a small team.

### 2026-08-01: Next.js App Router
- **Decision:** Use Next.js App Router (not Pages Router).
- **Rationale:** Server Components by default, better data fetching patterns, layouts, and streaming support.

### 2026-08-01: PostgreSQL with Prisma ORM
- **Decision:** PostgreSQL for data storage, Prisma for ORM.
- **Rationale:** PostgreSQL provides ACID transactions, Decimal types for money, robust constraints. Prisma provides type-safe queries and migration management.

### 2026-08-01: Optional Customer Accounts
- **Decision:** Customer accounts are optional and separate from customer business records.
- **Rationale:** Business records must exist independently of online account creation.

### 2026-08-01: Customer and CustomerAccount Separation
- **Decision:** `Customer` (business record) and `CustomerAccount` (login credentials) are separate entities with an optional one-to-one relation.

### 2026-08-01: Append-Only Payment Ledger
- **Decision:** Payments are individual auditable records that cannot be silently edited or deleted. Corrections use void/reversal records.

### 2026-08-01: No Floating-Point Money
- **Decision:** All monetary values use PostgreSQL Decimal/Numeric types, never JavaScript floating-point.

### 2026-08-01: Server-Side Financial Calculations
- **Decision:** All financial totals, balances, and due amounts are calculated server-side dynamically.

---

## Phase 0.5 & 0.5.1 Hardening & Security Decisions (2026-08-01)

### 2026-08-01: Elimination of Circular Bike/Purchase Foreign Key
- **Decision:** Remove `Bike.purchaseId`. The relation `Purchase.bikeId` is the sole authoritative foreign key.

### 2026-08-01: Relational Entities for Offers and Request Images
- **Decision:** Replace array-based `Offer.applicableBikeIds` and `SellBikeRequest.imagePaths` with relational join tables `OfferBike` and `SellBikeRequestImage`.

### 2026-08-01: Five Canonical Public Bike Inventory Statuses
- **Decision:** Lock public bike status enum strictly to `DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`.

### 2026-08-01: Keyed HMAC for Duplicate NID Identification
- **Decision:** Duplicate NID detection uses a keyed `HMAC-SHA256` hash (`nidNumberHmac`) using a secret server pepper kept outside the database.

### 2026-08-01: Session Token Hashing (`AdminSession.sessionTokenHash`)
- **Decision:** The database `AdminSession` record stores a SHA-256 hash of the session token (`sessionTokenHash`).

### 2026-08-01: Root Workspace Overrides for pnpm 11 (`pnpm-workspace.yaml`)
- **Decision:** Move all transitive dependency overrides (`sharp: 0.35.3`, `postcss: 8.5.25`) to `pnpm-workspace.yaml`.

### 2026-08-01: Mandatory Blocking CI Security Audit Gate
- **Decision:** `pnpm audit --audit-level=high` runs as a mandatory blocking step in `.github/workflows/ci.yml`. `continue-on-error: true` is strictly prohibited.

---

## Phase 1 & 1.1 Database Environment & Schema Hardening Decisions (2026-08-01 & 2026-08-02)

### 2026-08-01: Local Development Container Environment (`compose.yaml`)
- **Decision:** Containerize PostgreSQL major version 18 using `postgres:18-alpine` bound strictly to `127.0.0.1:5434` with project-scoped volume mounted at `/var/lib/postgresql`. Next.js application remains uncontainerized for fast local development.
- **Rationale:** Isolates database state, ensures identical database engine version across development environments, and protects local network interfaces.

### 2026-08-02: Script-Based Shadow Database Initializer (`01-create-shadow-database.sh`)
- **Decision:** Create and commit `docker/postgres/init/01-create-shadow-database.sh` with `set -eu` and safe variable validation to initialize `POSTGRES_SHADOW_DB` on first boot.
- **Rationale:** Guarantees fresh clones contain every file referenced by `compose.yaml` without relying on uncommitted setup scripts.

### 2026-08-02: Normalized Admin Email (`AdminUser.normalizedEmail`)
- **Decision:** Add `normalizedEmail` (`String @unique @db.VarChar(255)`) to `AdminUser` for case-insensitive authentication queries while preserving `email` for display.
- **Rationale:** Prevents security bypasses or login confusion due to case sensitivity in email input.

### 2026-08-02: Hardened Payment & Expense Ledger Immutability Triggers
- **Decision:** Implement PostgreSQL triggers `fn_prevent_purchase_payment_tampering`, `fn_prevent_sale_payment_tampering`, and `fn_prevent_expense_tampering`. Reject insertions with pre-voided flags, block all `DELETE` operations, block core field updates using `IS DISTINCT FROM`, require complete void metadata (`voidedAt`, `voidedByAdminId`, non-empty `voidReason`) during void transitions, and block unvoiding.
- **Rationale:** Enforces payment and expense ledger immutability at the database engine level.

### 2026-08-02: Mandatory Database Integrity Test Suite (`pnpm db:test-integrity`)
- **Decision:** Create `scripts/test-database-integrity.ts` executing 37 database assertions (triggers, check constraints, partial index) inside a rolled-back transaction, integrated into CI.
- **Rationale:** Prisma schema drift checks (`prisma migrate diff`) do not validate unsupported database triggers or custom CHECK constraints; explicit runtime integrity testing is mandatory.

---

## Phase 2 Secure Admin Authentication & Shell Decisions (2026-08-02)

### 2026-08-02: Argon2id Credential Hashing
- **Decision:** Admin credentials are hashed using Argon2id (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`). Constant-work dummy verification (`verifyAgainstDummy`) executes when an email is not found to prevent timing-based enumeration attacks.
- **Rationale:** Aligns with OWASP guidelines and prevents account enumeration.

### 2026-08-02: Privacy-Preserving HMAC-SHA256 Login Throttling
- **Decision:** Rate limiting uses `AdminLoginThrottle` keyed by an HMAC-SHA256 hex digest (`normalizedEmail:clientAddress`). Neither raw emails nor IP addresses are stored.
- **Rationale:** Prevents brute-force credential stuffing while preserving client privacy.

### 2026-08-02: Strict Edge Proxy vs. Server DAL Separation
- **Decision:** `src/proxy.ts` performs optimistic cookie-presence check only and does NOT import database ORMs or Argon2 native modules. Real authentication and role validation execute in Server Components and Server Actions via `requireAdmin()`.
- **Rationale:** Keeps the edge runtime lightweight while ensuring true database-backed security enforcement on the server.

### 2026-08-02: Interactive Bootstrap CLI (`pnpm admin:create`)
- **Decision:** First administrator account creation requires explicit interactive TTY invocation via `pnpm admin:create` (`scripts/create-admin.ts`) with hidden password input. Automatic seeding of default credentials in `prisma/seed.ts` is strictly prohibited.
- **Rationale:** Prevents default credential vulnerabilities in production environments.
