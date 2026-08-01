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

## Phase 1 Database Environment & Schema Decisions (2026-08-01)

### 2026-08-01: Local Development Container Environment (`compose.yaml`)
- **Decision:** Containerize PostgreSQL major version 18 using `postgres:18-alpine` bound strictly to `127.0.0.1:5434` with persistent volume `bike_postgres_data`. Next.js application remains uncontainerized for fast local development.
- **Rationale:** Isolates database state, ensures identical database engine version across development environments, and protects local network interfaces.

### 2026-08-01: Separate Development Shadow Database (`bike_management_shadow`)
- **Decision:** Automatically create a shadow database `bike_management_shadow` via `/docker-entrypoint-initdb.d/01-create-shadow-database.sql` for Prisma development migration diffing.
- **Rationale:** Prevents migration lock conflicts and enables fast, isolated shadow database migration checks during `prisma migrate dev`.

### 2026-08-01: Prisma 7 PostgreSQL Driver Adapter Architecture
- **Decision:** Use `@prisma/adapter-pg` and `pg.Pool` in `src/lib/prisma.ts` and `prisma/seed.ts` with custom output path `src/generated/prisma`.
- **Rationale:** Matches Prisma 7 requirements for PostgreSQL native connections while maintaining server-only client singleton isolation.

### 2026-08-01: 26 Normalized Business Entities & Strict Relation Deletion Rules
- **Decision:** Implement 26 complete business entities in `prisma/schema.prisma`. All financial records (`Purchase`, `Sale`, `PurchasePayment`, `SalePayment`, `Expense`) use `onDelete: Restrict` or `NoAction`. Destructive cascade deletions are permitted only on non-financial child records (`CustomerRole`, `BikeImage`, `BikeCondition`, `OfferBike`, `SellBikeRequestImage`).
- **Rationale:** Protects financial auditability and prevents accidental loss of transaction history when parent entities are deleted.

### 2026-08-01: Database-Level Payment & Audit Immutability Triggers
- **Decision:** Add PostgreSQL trigger functions (`fn_prevent_purchase_payment_tampering`, `fn_prevent_sale_payment_tampering`, `fn_prevent_audit_log_tampering`, `fn_prevent_bike_status_history_tampering`) in custom migration SQL.
- **Rationale:** Enforces payment ledger immutability and audit trail append-only behavior at the database engine level, preventing accidental or malicious SQL updates/deletions even outside the ORM.

### 2026-08-01: Partial Unique Index for Cover Image (`idx_bike_image_cover`)
- **Decision:** Create a PostgreSQL partial unique index `CREATE UNIQUE INDEX "idx_bike_image_cover" ON "BikeImage"("bikeId") WHERE "isCover" = true;` in custom migration SQL.
- **Rationale:** Guarantees at the database level that no bike can ever have more than one cover image assigned.

### 2026-08-01: Idempotent Singleton Seed Foundation (`prisma/seed.ts`)
- **Decision:** Seed script populates non-sensitive `ShopSetting` entries (`business_name: "Sristy-Dristy Bike House"`, `legal_name: "Sristy-Dristy Enterprise"`) using `upsert`. No customer records, NID numbers, bank details, or admin passwords are seeded.
- **Rationale:** Ensures clean environment bootstrapping without polluting development databases with synthetic personal data.
