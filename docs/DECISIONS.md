# Architecture and Product Decisions

All decisions are dated 2026-08-01 (Phase 0).

## 2026-08-01: TypeScript Full-Stack Monolith
- **Decision**: Single Next.js repository with TypeScript for both frontend and backend
- **Rationale**: Reduces deployment complexity, shares types between client and server, single codebase for a small team
- **Alternatives considered**: Separate Express/NestJS backend — rejected due to unnecessary complexity for this scale

## 2026-08-01: Next.js App Router
- **Decision**: Use Next.js App Router (not Pages Router)
- **Rationale**: Server Components by default, better data fetching patterns, layouts, streaming support

## 2026-08-01: PostgreSQL with Prisma ORM
- **Decision**: PostgreSQL for data storage, Prisma for ORM
- **Rationale**: PostgreSQL provides ACID transactions, Decimal types for money, robust constraints. Prisma provides type-safe queries and migration management.
- **Alternatives rejected**: MongoDB (no ACID transactions, poor fit for financial data)

## 2026-08-01: Optional Customer Accounts
- **Decision**: Customer accounts are optional, separate from business records
- **Rationale**: Most customers interact via WhatsApp/phone. Mandatory accounts would create friction. Business records must exist independently.

## 2026-08-01: Customer and CustomerAccount Separation
- **Decision**: Customer (business record) and CustomerAccount (login credentials) are separate entities with optional one-to-one relation
- **Rationale**: Admin creates customer records during transactions. Customer may optionally create a login later. Keeps business data independent of authentication.

## 2026-08-01: NID Pending Workflow
- **Decision**: NID starts as PENDING and is required only for final transaction completion
- **Rationale**: Allows business operations to begin (enquiry, reservation, initial payment) before NID verification is complete. Practical for how the business actually operates.

## 2026-08-01: Append-Only Payment Ledger
- **Decision**: Payments are individual auditable records that cannot be silently edited or deleted. Corrections use void/reversal records.
- **Rationale**: Financial integrity requires an auditable trail. Silent deletion of payment records is a fraud risk.

## 2026-08-01: Separate Purchase and Sale Payment Domains
- **Decision**: PurchasePayment and SalePayment are separate tables, not a unified payment table
- **Rationale**: Purchases (money going out) and sales (money coming in) have different workflows, validation rules, and reporting needs. Separation prevents confusion.

## 2026-08-01: Separate Public and Financial Status
- **Decision**: A bike's public display status (AVAILABLE/SOLD) is independent of its financial settlement status
- **Rationale**: A bike can be marked as SOLD publicly while payments are still being collected from the buyer. These are different business concerns.

## 2026-08-01: No Live Chat in MVP
- **Decision**: No public live chat feature in the initial release
- **Rationale**: WhatsApp is the primary communication channel for this business. A custom chat system adds significant complexity without proportional value.

## 2026-08-01: Website Forms + WhatsApp as Primary Communication
- **Decision**: Public website provides submission forms (sell bike, request bike, enquiry, inspection). WhatsApp and phone calls are the primary follow-up channels.
- **Rationale**: Matches actual business workflow. Customers prefer WhatsApp for ongoing communication. Forms capture initial structured data.

## 2026-08-01: No Floating-Point Money
- **Decision**: All monetary values use PostgreSQL Decimal/Numeric types, never JavaScript floating-point
- **Rationale**: Floating-point arithmetic causes rounding errors in financial calculations. Decimal types provide exact precision.

## 2026-08-01: Server-Side Financial Calculations
- **Decision**: All financial totals, balances, and due amounts are calculated server-side
- **Rationale**: Client-side calculations can be manipulated and may have precision issues. Server is the source of truth.
