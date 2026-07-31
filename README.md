# Bike Management System

A full-stack motorcycle dealership management system for **Sristy-Dristy Bike House** (Sristy-Dristy Enterprise).

## Current Status

**Phase 0 — Foundation and Documentation** is complete.

This repository contains the project foundation: Next.js application skeleton, Prisma configuration, design system, and comprehensive project documentation. No business modules (database schema, authentication, customer management, inventory, sales, payments) are implemented yet.

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Database | PostgreSQL (planned) |
| ORM | Prisma |
| Validation | Zod |
| Package Manager | pnpm |
| Linting | ESLint |

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (required from Phase 1 onward)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/WadudMahmudJoy/Bike-Management-System.git
cd Bike-Management-System

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your actual database credentials

# Run development server
pnpm dev
```

## Available Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |

## Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

> **Security Warning**: Never commit `.env` files, real credentials, customer data, NID images, or database dumps to version control. The `.gitignore` is configured to exclude these files.

## Project Structure

```
├── AGENTS.md                  # AI coding agent instructions
├── README.md                  # This file
├── docs/                      # Project documentation
│   ├── ARCHITECTURE.md        # System architecture
│   ├── CUSTOMER_ACCOUNT_DECISION.md  # Customer account policy
│   ├── DATABASE_DESIGN.md     # Planned database schema
│   ├── DECISIONS.md           # Architecture and product decisions
│   ├── HANDOFF.md             # Handoff notes for next agent/phase
│   ├── IMPLEMENTATION_PLAN.md # Phase-by-phase implementation plan
│   ├── PRODUCT_SPEC.md        # Full product specification
│   ├── PROJECT_STATUS.md      # Current project status
│   ├── SECURITY_REQUIREMENTS.md  # Security requirements
│   ├── TESTING_CHECKLIST.md   # Testing verification checklist
│   └── UI_DESIGN_SYSTEM.md    # Design system documentation
├── prisma/
│   └── schema.prisma          # Prisma schema (foundation only)
├── src/
│   └── app/
│       ├── admin/page.tsx     # Admin placeholder
│       ├── api/health/route.ts # Health check endpoint
│       ├── globals.css        # Global styles and design tokens
│       ├── layout.tsx         # Root layout
│       └── page.tsx           # Homepage
├── .env.example               # Environment variable template
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration (strict)
└── next.config.ts             # Next.js configuration
```

## Documentation

All project documentation is in the `docs/` directory. Key documents:

- **[Product Specification](docs/PRODUCT_SPEC.md)** — Complete MVP feature requirements
- **[Architecture](docs/ARCHITECTURE.md)** — System architecture and design decisions
- **[Database Design](docs/DATABASE_DESIGN.md)** — Planned database schema and rules
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** — Phase-by-phase development plan
- **[Security Requirements](docs/SECURITY_REQUIREMENTS.md)** — Security constraints and policies
- **[UI Design System](docs/UI_DESIGN_SYSTEM.md)** — Design tokens and style guidelines
- **[Decisions](docs/DECISIONS.md)** — Dated architecture and product decisions
- **[Handoff](docs/HANDOFF.md)** — Instructions for the next development phase

## Security

- No real customer data, credentials, or private documents should ever be committed
- All `.env` files are excluded from version control
- Customer documents (NID, bank details) will use private storage
- See `docs/SECURITY_REQUIREMENTS.md` for full security policy

## License

Private — Sristy-Dristy Enterprise
