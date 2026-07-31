# Architecture and Product Decisions

This document logs all authoritative architectural and product decisions for the **Bike Management System** (Sristy-Dristy Bike House).

---

## Initial Phase 0 Decisions (2026-08-01)

### 2026-08-01: TypeScript Full-Stack Monolith
- **Decision:** Single Next.js repository with TypeScript for both frontend and backend.
- **Rationale:** Reduces deployment complexity, shares types between client and server, single codebase for a small team.
- **Alternatives rejected:** Separate Express/NestJS backend — rejected due to unnecessary operational complexity.

### 2026-08-01: Next.js App Router
- **Decision:** Use Next.js App Router (not Pages Router).
- **Rationale:** Server Components by default, better data fetching patterns, layouts, and streaming support.

### 2026-08-01: PostgreSQL with Prisma ORM
- **Decision:** PostgreSQL for data storage, Prisma for ORM.
- **Rationale:** PostgreSQL provides ACID transactions, Decimal types for money, robust constraints. Prisma provides type-safe queries and migration management.
- **Alternatives rejected:** MongoDB — rejected due to lack of standard ACID transactions and poor fit for financial ledgers.

### 2026-08-01: Optional Customer Accounts
- **Decision:** Customer accounts are optional and separate from customer business records.
- **Rationale:** Most customers interact via WhatsApp/phone. Mandatory accounts create unnecessary friction. Business records must exist independently.

### 2026-08-01: Customer and CustomerAccount Separation
- **Decision:** `Customer` (business record) and `CustomerAccount` (login credentials) are separate entities with an optional one-to-one relation.
- **Rationale:** Admin creates customer records during transactions. Customer may optionally create a login later. Keeps business data independent of authentication.

### 2026-08-01: NID Pending Workflow
- **Decision:** NID starts as `PENDING` and is required only for final transaction completion.
- **Rationale:** Allows business operations to begin (enquiry, reservation, initial payment) before NID verification is complete.

### 2026-08-01: Append-Only Payment Ledger
- **Decision:** Payments are individual auditable records that cannot be silently edited or deleted. Corrections use void/reversal records.
- **Rationale:** Financial integrity requires an auditable trail. Silent deletion of payment records is a fraud risk.

### 2026-08-01: Separate Purchase and Sale Payment Domains
- **Decision:** `PurchasePayment` and `SalePayment` are separate tables, not a unified payment table.
- **Rationale:** Purchases (money going out) and sales (money coming in) have different workflows, validation rules, and reporting needs.

### 2026-08-01: Separate Public and Financial Status
- **Decision:** A bike's public display status (`AVAILABLE`, `SOLD`) is independent of its financial settlement status.
- **Rationale:** A bike can be marked as `SOLD` publicly while payments are still being collected from the buyer.

### 2026-08-01: No Live Chat in MVP
- **Decision:** No public live chat feature in the initial release.
- **Rationale:** WhatsApp is the primary communication channel for this business.

### 2026-08-01: Website Forms + WhatsApp as Primary Communication
- **Decision:** Public website provides submission forms (sell bike, request bike, enquiry, inspection). WhatsApp and phone calls are primary follow-up channels.

### 2026-08-01: No Floating-Point Money
- **Decision:** All monetary values use PostgreSQL Decimal/Numeric types, never JavaScript floating-point.
- **Rationale:** Floating-point arithmetic causes rounding errors in financial calculations.

### 2026-08-01: Server-Side Financial Calculations
- **Decision:** All financial totals, balances, and due amounts are calculated server-side.
- **Rationale:** Client-side calculations can be manipulated. Server is the single source of truth.

---

## Phase 0.5 Baseline & Hardening Decisions (2026-08-01)

### 2026-08-01: Elimination of Circular Bike/Purchase Foreign Key
- **Decision:** Remove `Bike.purchaseId`. The relation `Purchase.bikeId` is the sole authoritative foreign key.
- **Rationale:** Eliminates circular relational dependency between `Bike` and `Purchase`. A bike's purchase history is queried via the `Purchase` entity.

### 2026-08-01: Relational Entities for Offers and Request Images
- **Decision:** Replace array-based `Offer.applicableBikeIds` and `SellBikeRequest.imagePaths` with relational join tables `OfferBike` and `SellBikeRequestImage`.
- **Rationale:** Guarantees foreign-key integrity, prevents duplicate offer assignments via composite unique keys `(offerId, bikeId)`, and permits individual image deletion and ordering without rewriting JSON arrays.

### 2026-08-01: Five Canonical Public Bike Inventory Statuses
- **Decision:** Lock public bike status enum strictly to `DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`.
- **Rationale:** Standardizes inventory lifecycle. Statuses like `UNLISTED` or `MAINTENANCE` are excluded from the MVP.

### 2026-08-01: Explicit Payment Field Naming & Directions
- **Decision:** Rename ambiguous fields like `receivedBy` in `PurchasePayment` to explicit fields: `paidAt` and `createdByAdminId` for purchases (money out), and `receivedAt` and `receivedByAdminId` for sales (money in).
- **Rationale:** Prevents confusion between incoming customer payments and outgoing supplier payments.

### 2026-08-01: Keyed HMAC for Duplicate NID Identification
- **Decision:** Duplicate NID detection will use a keyed `HMAC-SHA256` hash (`nidNumberHmac`) using a secret server pepper kept outside the database. Plain SHA hashes are prohibited.
- **Rationale:** Plain unsalted hashes are vulnerable to rainbow table attacks if database dumps leak.

### 2026-08-01: Session Token Hashing (`AdminSession.sessionTokenHash`)
- **Decision:** The database `AdminSession` record will store a SHA-256 hash of the session token (`sessionTokenHash`), while the raw session token is sent to the client via `HttpOnly` cookie.
- **Rationale:** If a database read-replica or backup is compromised, active session tokens cannot be hijacked.

### 2026-08-01: Argon2id for Password Hashing
- **Decision:** Lock Argon2id as the mandatory password-hashing algorithm for future admin and customer authentication.
- **Rationale:** Argon2id provides superior protection against GPU/ASIC brute-force attacks compared to legacy algorithms.

### 2026-08-01: Structured Bike Request Budget
- **Decision:** Replace unstructured `budgetRange` string in `BikeRequest` with separate `minimumBudget` and `maximumBudget` `Decimal` columns.
- **Rationale:** Enables precise numerical filtering and automated matching between customer requests and available inventory.

### 2026-08-01: Server-Safe Site Configuration & Indexing Control
- **Decision:** Control site URL and search engine indexing strictly through `src/lib/site-config.ts` powered by `SITE_URL` and `SITE_INDEXING_ENABLED`.
- **Rationale:** Prevents local development or staging URLs from accidentally leaking into production canonical tags or sitemaps. Boot fails if indexing is enabled with a localhost URL.

### 2026-08-01: No Pseudo CSP in Phase 0.5
- **Decision:** Do not enforce a fake or overly permissive Content Security Policy header in Phase 0.5.
- **Rationale:** Weak CSP policies (e.g., relying on `unsafe-eval` or wildcard origins) provide false security. A strict nonce-based CSP will be implemented after asset hosting and analytics origins are finalized.
