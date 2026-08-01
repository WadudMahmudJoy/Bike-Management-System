# System Architecture

## Overview
This document describes the full-stack architecture of the **Bike Management System** (Customer-facing name: **Sristy-Dristy Bike House**, Legal name: **Sristy-Dristy Enterprise**).

---

## Technology Stack

| Layer | Technology | Status / Details |
|---|---|---|
| **Runtime** | Node.js | v22+ (ESNext target) |
| **Framework** | Next.js 16 (App Router) | Full-stack TypeScript monolith |
| **Language** | TypeScript | Strict mode enabled (`tsconfig.json`) |
| **Styling** | Tailwind CSS 4 | Custom design system tokens (`globals.css`) |
| **Database** | PostgreSQL 18 | Docker containerized (`postgres:18-alpine`, port 5434) |
| **ORM** | Prisma 7 | `@prisma/adapter-pg` driver adapter & `pg.Pool` |
| **Validation** | Zod | Server & Client payload validation |
| **Package Manager**| pnpm 11 | Locked (`packageManager: pnpm@11.1.2`, root overrides in `pnpm-workspace.yaml`) |
| **Linting & Quality**| ESLint 9 & TypeScript CLI | Enforced via CI pipeline |

---

## Architecture Pattern

The system is designed as a **Full-Stack TypeScript Monolith** using Next.js App Router:
- **Server Components by Default:** Page layouts and data fetching are handled on the server for security, performance, and optimal SEO.
- **Client Components where Interactive:** Form fields, interactive filters, and client-side UI state use Client Components (`"use client"`).
- **Server Actions for Mutations:** Form submissions and record mutations execute via type-safe Server Actions.
- **API Routes for Special Endpoints:** System endpoints (e.g., `/api/health`, dynamic `/robots.txt`, dynamic `/sitemap.xml`) use standard App Router Route Handlers.
- **No Separate Backend Framework:** Express, NestJS, or Python services are strictly prohibited.

---

## Directory Structure

```
Bike-Management-System/
├── .github/
│   ├── dependabot.yml         # Weekly dependency update checks
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline with PostgreSQL 18 service container
├── docker/
│   └── postgres/
│       └── init/
│           └── 01-create-shadow-database.sql # Creates bike_management_shadow on first boot
├── docs/                      # Comprehensive project documentation
│   ├── ARCHITECTURE.md        # System architecture (this document)
│   ├── CUSTOMER_ACCOUNT_DECISION.md # Customer account policy & linking design
│   ├── DATABASE_DESIGN.md     # Authoritative database design specification
│   ├── DECISIONS.md           # Dated architectural and product decisions
│   ├── HANDOFF.md             # Handoff notes for future agent sessions
│   ├── IMPLEMENTATION_PLAN.md # 14-phase development roadmap
│   ├── PRODUCT_SPEC.md        # Complete MVP product requirements
│   ├── PROJECT_STATUS.md      # Current phase status and verification results
│   ├── SECURITY_REQUIREMENTS.md # Implemented and planned security controls
│   ├── SEO_REQUIREMENTS.md    # SEO technical guidelines and metadata policies
│   ├── TESTING_CHECKLIST.md   # Verification checklist across phases
│   └── UI_DESIGN_SYSTEM.md    # Design system, color tokens, and UI layout rules
├── prisma/
│   ├── migrations/            # Applied Prisma migrations & custom SQL
│   │   └── 20260801174101_init_dealership_schema/ # Initial migration with CHECK constraints & triggers
│   ├── schema.prisma          # Complete 26-model dealership schema specification
│   └── seed.ts                # Idempotent ShopSetting seed foundation
├── public/                    # Static public assets
├── src/
│   ├── app/                   # Next.js App Router pages and handlers
│   │   ├── admin/             # Administrative routes
│   │   │   └── page.tsx       # Admin panel placeholder (noindex metadata)
│   │   ├── api/               # API route handlers
│   │   │   └── health/        # Health check endpoint (`/api/health`)
│   │   ├── globals.css        # Tailwind CSS imports and design tokens
│   │   ├── layout.tsx         # Root layout with global metadata defaults & fonts
│   │   ├── page.tsx           # Public homepage with page-specific canonical metadata
│   │   ├── robots.ts          # Metadata route handler for `/robots.txt`
│   │   └── sitemap.ts         # Metadata route handler for `/sitemap.xml`
│   ├── generated/
│   │   └── prisma/            # Generated Prisma 7 Client output
│   └── lib/
│       ├── prisma.ts          # Server-only Prisma client singleton using @prisma/adapter-pg
│       └── site-config.ts     # Server-safe SEO & site URL configuration
├── .env.example               # Non-secret environment variable template
├── .gitignore                 # Exclusion rules for secrets, builds, & private uploads
├── AGENTS.md                  # Instructions for AI coding agents
├── compose.yaml               # Docker Compose file for PostgreSQL 18 & shadow database
├── next.config.ts             # Next.js configuration with security headers
├── package.json               # Dependencies, scripts, and packageManager lock
├── pnpm-workspace.yaml        # pnpm 11 build script permissions (`allowBuilds`) & root overrides
├── prisma.config.ts           # Prisma 7 environment & seed configuration
├── README.md                  # Project overview, database setup, and verification guide
└── tsconfig.json              # Strict TypeScript compiler options
```

---

## Database Architecture & Immutability Layer (Phase 1)

1. **26 Normalized Relational Entities:** Schema defines 26 models in `prisma/schema.prisma` covering Administration, Customers, Bike Inventory, Purchasing, Sales, Operations, Offers, Requests, Inquiries, Bookings, and Settings.
2. **Database Engine Immutability Triggers:**
   - `PurchasePayment` & `SalePayment`: Block `DELETE` and core field `UPDATE`. Allow voiding (`isVoided = true`) only with complete metadata. Block unvoiding.
   - `AuditLog` & `BikeStatusHistory`: Block `UPDATE` and `DELETE` (pure append-only).
3. **Check Constraints & Partial Indexes:** Custom PostgreSQL CHECK constraints enforce monetary positivity, year boundaries (1900–2100), and price logic (`finalPrice <= listedPrice`). Partial unique index `idx_bike_image_cover` limits cover images to max 1 per bike.
4. **Server-Only Prisma Singleton (`src/lib/prisma.ts`):** Uses `@prisma/adapter-pg` and `pg.Pool` to manage database connections while ensuring client code cannot leak into browser bundles.
