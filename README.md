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
- **Validation:** Zod
- **Package Manager:** pnpm 11 (`packageManager: pnpm@11.1.2`, root overrides in `pnpm-workspace.yaml`)
- **Linting:** ESLint 9

---

## Project Status

- **Phase 0 (Foundation):** Complete
- **Phase 0.5 (Baseline & Hardening):** Complete
- **Phase 0.5.1 (Dependency Security Gate & SEO Metadata Correction):** Complete
- **Phase 0.5.2 (GitHub Actions Runtime Correction):** Complete
- **Phase 1 (PostgreSQL Environment & Complete Prisma Schema):** Complete
- **Phase 2 (Admin Authentication & Admin Shell):** Next Approved Phase (Requires User Permission)

---

## Local Development & Database Setup Guide (Windows PowerShell)

Follow these exact steps to set up the local PostgreSQL database and application environment:

### 1. Create Local Environment Configuration (`.env`)
Create a local `.env` file (Git-ignored) based on `.env.example`:

```powershell
Copy-Item .env.example .env
```

The default local development database credentials are:
- `POSTGRES_USER="bike_admin"`
- `POSTGRES_PASSWORD="CHANGE_ME_FOR_LOCAL_DEVELOPMENT"`
- `POSTGRES_DB="bike_management_dev"`
- `POSTGRES_PORT="5434"`
- `DATABASE_URL="postgresql://bike_admin:CHANGE_ME_FOR_LOCAL_DEVELOPMENT@127.0.0.1:5434/bike_management_dev?schema=public"`
- `SHADOW_DATABASE_URL="postgresql://bike_admin:CHANGE_ME_FOR_LOCAL_DEVELOPMENT@127.0.0.1:5434/bike_management_shadow?schema=public"`

### 2. Start PostgreSQL Container
Start the PostgreSQL 18 development and shadow databases:

```powershell
docker compose up -d --wait
```

### 3. Check Container Health
Verify that the `bike-postgres` container is running and healthy:

```powershell
docker compose ps
```

### 4. Apply Database Migrations
Apply the initial dealership schema migration (includes custom check constraints and immutability triggers):

```powershell
pnpm exec prisma migrate dev
```

### 5. Generate Prisma Client
Generate the type-safe Prisma Client to `src/generated/prisma`:

```powershell
pnpm exec prisma generate
```

### 6. Seed Foundation Data
Seed the singleton `ShopSetting` foundation data:

```powershell
pnpm exec prisma db seed
```

### 7. Open Prisma Studio (Optional)
Inspect and manage database records interactively:

```powershell
pnpm run db:studio
```

### 8. Stop PostgreSQL Container
When finished development, stop the database container:

```powershell
docker compose down
```

---

## Verification Commands

Run full verification suite before submitting pull requests:

```powershell
pnpm install --frozen-lockfile
docker compose config
docker compose up -d --wait
pnpm exec prisma format
pnpm exec prisma validate
pnpm exec prisma generate
pnpm exec prisma migrate status
pnpm exec prisma migrate diff --exit-code --from-config-datasource --to-schema prisma/schema.prisma
pnpm exec prisma db seed
pnpm lint
pnpm typecheck
pnpm build
pnpm audit --audit-level=high
git diff --check
```

---

## License & Ownership

© 2026 Sristy-Dristy Enterprise. All rights reserved.
