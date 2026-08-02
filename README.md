# Bike Management System (Sristy-Dristy Bike House)

A production-grade pre-owned motorcycle dealership management system and public showroom website.

- **Customer-Facing Name:** Sristy-Dristy Bike House
- **Legal Business Name:** Sristy-Dristy Enterprise
- **Repository:** `https://github.com/WadudMahmudJoy/Bike-Management-System`

---

## Technology Stack

- **Framework:** Next.js 16 (App Router full-stack monolith)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **Database & ORM:** PostgreSQL 18 & Prisma 7 (`@prisma/adapter-pg`)
- **Authentication:** Argon2id, SHA-256 session digests, HttpOnly cookies, HMAC login rate limiting
- **Validation:** Zod
- **Package Manager:** pnpm 11 (`packageManager: pnpm@11.1.2`, root overrides in `pnpm-workspace.yaml`)
- **Linting & Testing:** ESLint 9 & Vitest 3

---

## Project Status

- **Phase 0 (Foundation):** Complete
- **Phase 0.5 (Baseline & Hardening):** Complete
- **Phase 0.5.1 (Dependency Security Gate & SEO Metadata Correction):** Complete
- **Phase 0.5.2 (GitHub Actions Runtime Correction):** Complete
- **Phase 1 & Phase 1.1 (PostgreSQL Environment & Schema Corrections):** Merged into `main`
- **Phase 2 (Admin Authentication, Sessions, Throttle & Admin Shell):** Complete on feature branch `phase-2/admin-authentication` (PR pending review)

---

## Local Development & Database Setup Guide (Windows PowerShell)

Follow these exact steps to set up the local PostgreSQL database and application environment:

### 1. Create Local Environment Configuration (`.env`)
Create a local `.env` file (Git-ignored) based on `.env.example`:

```powershell
Copy-Item .env.example .env
```

Developers MUST set a secure local password in `.env` and update both database connection URLs:
- `POSTGRES_USER="bike_admin"`
- `POSTGRES_PASSWORD="SET_YOUR_LOCAL_DEVELOPMENT_PASSWORD"`
- `POSTGRES_DB="bike_management_dev"`
- `POSTGRES_SHADOW_DB="bike_management_shadow"`
- `POSTGRES_PORT="5434"`
- `DATABASE_URL="postgresql://bike_admin:SET_YOUR_LOCAL_DEVELOPMENT_PASSWORD@127.0.0.1:5434/bike_management_dev?schema=public"`
- `SHADOW_DATABASE_URL="postgresql://bike_admin:SET_YOUR_LOCAL_DEVELOPMENT_PASSWORD@127.0.0.1:5434/bike_management_shadow?schema=public"`
- `AUTH_RATE_LIMIT_SECRET="SET_A_RANDOM_SECRET_OF_AT_LEAST_32_BYTES"`

### 2. Start PostgreSQL Container
Start the PostgreSQL 18 development and shadow databases:

```powershell
docker compose up -d --wait
```

### 3. Apply Database Migrations & Generate Client
Apply database migrations (includes custom CHECK constraints, partial cover index, payment/expense immutability triggers, and throttle table):

```powershell
pnpm exec prisma migrate dev
pnpm exec prisma generate
```

### 4. Seed Foundation Data
Seed the singleton `ShopSetting` foundation data:

```powershell
pnpm exec prisma db seed
```

### 5. Create First Owner Account (Interactive CLI)
To create an administrative account, run the interactive TTY CLI:

```powershell
pnpm admin:create
```

### 6. Run Test Suites
Run the database integrity, unit auth, and database integration test suites:

```powershell
pnpm db:test-integrity
pnpm test
pnpm test:admin-auth
```

---

## Full Verification Suite

Run full verification suite before submitting pull requests:

```powershell
pnpm install --frozen-lockfile
docker compose config
docker compose up -d --wait
docker compose ps
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate status
pnpm exec prisma db seed
pnpm exec prisma db seed
pnpm db:test-integrity
pnpm test
pnpm test:admin-auth
pnpm lint
pnpm typecheck
pnpm build
pnpm audit --audit-level=high
pnpm exec prisma migrate diff --exit-code --from-config-datasource --to-schema prisma/schema.prisma
git diff --check
```

---

## License & Ownership

© 2026 Sristy-Dristy Enterprise. All rights reserved.
