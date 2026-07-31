# System Architecture

## Overview
This document describes the full-stack architecture of the **Bike Management System** (Customer-facing name: **Sristy-Dristy Bike House**, Legal name: **Sristy-Dristy Enterprise**).

---

## Technology Stack

| Layer | Technology | Status / Details |
|---|---|---|
| **Runtime** | Node.js | v20+ (ESNext target) |
| **Framework** | Next.js 16 (App Router) | Full-stack TypeScript monolith |
| **Language** | TypeScript | Strict mode enabled (`tsconfig.json`) |
| **Styling** | Tailwind CSS 4 | Custom design system tokens (`globals.css`) |
| **Database** | PostgreSQL | Planned (Phase 1) |
| **ORM** | Prisma 7 | Foundation configuration (`prisma.config.ts`, `schema.prisma`) |
| **Validation** | Zod | Server & Client payload validation |
| **Package Manager**| pnpm 11 | Locked (`packageManager: pnpm@11.1.2`) |
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
│       └── ci.yml             # GitHub Actions CI pipeline (lint, typecheck, build, audit)
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
│   └── schema.prisma          # Prisma schema (Datasource & Client generator)
├── public/                    # Static public assets
├── src/
│   ├── app/                   # Next.js App Router pages and handlers
│   │   ├── admin/             # Administrative routes
│   │   │   └── page.tsx       # Admin panel placeholder (noindex metadata)
│   │   ├── api/               # API route handlers
│   │   │   └── health/        # Health check endpoint (`/api/health`)
│   │   ├── globals.css        # Tailwind CSS imports and design tokens
│   │   ├── layout.tsx         # Root layout with dynamic metadata & fonts
│   │   ├── page.tsx           # Public homepage (Sristy-Dristy Bike House)
│   │   ├── robots.ts          # Metadata route handler for `/robots.txt`
│   │   └── sitemap.ts         # Metadata route handler for `/sitemap.xml`
│   └── lib/
│       └── site-config.ts     # Server-safe SEO & site URL configuration
├── .env.example               # Non-secret environment variable template
├── .gitignore                 # Exclusion rules for secrets, builds, & private uploads
├── AGENTS.md                  # Instructions for AI coding agents
├── next.config.ts             # Next.js configuration with security headers
├── package.json               # Dependencies, scripts, and packageManager lock
├── pnpm-workspace.yaml        # pnpm 11 build script permissions (`allowBuilds`)
├── prisma.config.ts           # Prisma 7 environment configuration
├── README.md                  # Project overview and setup instructions
└── tsconfig.json              # Strict TypeScript compiler options
```

---

## Security Baseline Architecture (Phase 0.5)

1. **HTTP Security Headers (`next.config.ts`):**
   - `poweredByHeader: false`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`
   - `X-Robots-Tag: noindex, nofollow, noarchive` for `/admin` and `/api/*` routes.
   - `Strict-Transport-Security: max-age=63072000` in production mode.
2. **Health Endpoint (`/api/health`):**
   - Returns minimal `{ status: "ok", service: "bike-management-system" }`.
   - Sends `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.
3. **Environment & Git Hygiene:**
   - Secrets, `.env` files, database dumps, customer NID images, and private uploads strictly excluded via `.gitignore`.
   - `SITE_INDEXING_ENABLED` controls crawler visibility. Default is `false`.

---

## Data & Validation Flow (Planned for Later Phases)

```
[ Public User / Admin Browser ]
               │
               ▼
[ Next.js Server Components / Actions ]
               │
               ├─► Zod Payload Validation (`src/lib/validation/`)
               │
               ├─► Server Authorization Check (`AdminSession` / RBAC)
               │
               ├─► Database Transaction (`Prisma Client` -> PostgreSQL)
               │
               └─► Redacted Audit Log Entry (`AuditLog`)
```

1. **Input Validation:** Zod schemas validate every form submission and API payload server-side.
2. **Financial Calculations:** Executed exclusively server-side using Decimal-compatible arithmetic. No floating-point operations.
3. **Sensitive Field Encryption:** NID numbers and bank accounts encrypted with AES-256-GCM at rest; duplicate NID lookup handled via HMAC-SHA256 index.
4. **Audit Trail:** All financial and inventory mutations generate an immutable `AuditLog` record with redacted sensitive fields.
