# Security Requirements

This document specifies the security controls, architecture, and requirements for the **Bike Management System** (Sristy-Dristy Bike House).

---

## 1. IMPLEMENTED IN PHASES 0 THROUGH 3A.2

The following baseline security, database, customer management, and authentication controls are active in the codebase:

### Authentication & Session Security (Phase 2)
- **Argon2id Hashing:** OWASP-aligned parameters (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`). Plain-text passwords are never logged or stored.
- **Anti-Enumeration Dummy Verification:** Non-existent account lookups run constant-work Argon2id verification (`verifyAgainstDummy`) to prevent timing attacks.
- **SHA-256 Session Digests:** Raw 32-byte tokens exist only in cookies. `AdminSession.sessionTokenHash` stores deterministic SHA-256 hex digests.
- **HTTP Cookie Enforcement:** `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, `__Host-` prefix in production.
- **HMAC-SHA256 Login Throttling:** `AdminLoginThrottle` keyed by HMAC-SHA256 hex digest (`normalizedEmail:clientAddress`). Stores zero raw email or IP data. Enforces 5-failure limit, 15-minute window, and 15-minute block duration.
- **Strict Proxy & DAL Separation:** Edge proxy (`src/proxy.ts`) performs optimistic cookie presence checks without DB/Crypto dependencies. Real authorization occurs in Server Components via `requireAdmin()`.
- **Interactive Owner Bootstrap CLI:** `pnpm admin:create` enforces interactive TTY execution and hidden password entry. No default credentials in seeds.

### Customer Management Security & Privacy (Phase 3A, 3A.1, & 3A.2)
- **Explicit Page & Action Authorization:** All customer Server Actions and Server Component route pages (`list`, `new`, `detail`, `edit`) call `await requireAdmin();` before parameter resolution or database access.
- **Phone Normalization & Masking:** Bangladesh mobile numbers are normalized to standard `+8801XXXXXXXXX` format. Non-privileged displays and list views output ONLY masked phone numbers (`+880 17***-**78`). Full numbers are visible only on detail pages for authenticated administrators.
- **Crockford Base32 Customer Code (`CUS-XXXXXXXX`):** Customer codes are generated using 8 unambiguous Crockford Base32 characters backed by a database `@unique` constraint and 5-attempt retry loop.
- **Controlled Duplicate-Phone Workflow:** Duplicate phones trigger a structured warning requiring explicit admin confirmation. Server re-queries duplicate IDs within the transaction and rejects submissions if the matching ID set changes.
- **Phone-Change-Only Duplicate Checking:** Duplicate checks execute ONLY when the normalized primary phone number changes. Unchanged phone edits to name, roles, or notes proceed without requiring duplicate confirmation.
- **Atomic Optimistic Concurrency Control:** All customer updates, archives, and restores require a valid `expectedUpdatedAt` ISO timestamp. Atomic database `updateMany` matching `id` + `updatedAt` ensures concurrent edits by another administrator produce safe `CONCURRENCY_CONFLICT` errors.
- **Service Error Sanitization & Redaction:** All domain exceptions (PostgreSQL, Prisma, connection failures) are caught and converted to generic, safe user-facing error messages. Database error codes, table names, SQL strings, and stack traces are strictly redacted.
- **Non-Throwing Filter Validation:** Malformed URL search parameters use `parseCustomerFilters(params)` with safe fallbacks and overlong query capping (max 100 chars), preventing HTTP 500 exceptions.
- **Client Data Minimization (`CustomerEditDTO`):** Edit pages convert customer details to `CustomerEditDTO` via `mapDetailToEditDTO()`, stripping creator details, audit history, normalized phone values, NID status, and archive state from Client Component props. Creator queries exclude admin email addresses.
- **Submission Pending Guards:** `CustomerForm` guards `handleSubmit` re-entry and disables submit/confirmation buttons while `isSubmitting` is true.
- **Privacy Audit Redaction:** Audit logs record high-level summaries (`CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_ARCHIVED`, `CUSTOMER_RESTORED`). Contact numbers, email addresses, notes, NID, bank details, and tokens are never written to audit metadata.
- **Zero Raw NID & Zero Bank Data Guarantee:** In Phase 3A, `CustomerIdentity` defaults to `nidStatus: PENDING` with zero raw NID numbers or images collected. Zero customer bank account records exist.

### Database Integrity & Engine-Level Security (Phase 1 & Phase 1.1)
- **Database Engine Isolation:** Local PostgreSQL containerized using `postgres:18-alpine` in `compose.yaml` and bound strictly to `127.0.0.1:5434` (`localhost` loopback only). Mounts named volume at `/var/lib/postgresql`. Public binding `0.0.0.0` is strictly forbidden.
- **Normalized Admin Email:** `AdminUser.normalizedEmail` (`String @unique`) enforces canonical lowercased case-insensitive email uniqueness for authentication.
- **Database Immutability Triggers (`migration.sql`):**
  - **`PurchasePayment` & `SalePayment` Triggers:** Block `DELETE` statements on payment records. Block `UPDATE` statements on core financial fields using `IS DISTINCT FROM`. Require new payments to start unvoided (`isVoided = false`). Restrict voiding to a one-way transition (`isVoided = true`) requiring `voidedAt`, `voidedByAdminId`, and a non-empty `voidReason`. Block unvoiding (`isVoided = false`).
  - **`Expense` Trigger (`fn_prevent_expense_tampering`):** Enforces identical append-only immutability rules on operational expense records.
  - **`AuditLog` & `BikeStatusHistory` Triggers:** Block both `UPDATE` and `DELETE` operations, enforcing strict append-only behavior at the database engine level.
- **Database CHECK Constraints:** Enforce nonnegative monetary values, positive purchase agreed prices, nonnegative sale prices (`finalPrice = listedPrice - discountAmount`), valid year ranges (1900–2100), positive engine capacity, nonnegative mileage, valid budget ranges (`minimumBudget <= maximumBudget`), percentage discount limits (0–100), encryption bundle completeness, internal void field metadata consistency, and throttle constraints (`failureCount >= 0`, `keyHash ~ '^[a-f0-9]{64}$'`, `blockedUntil >= windowStartedAt`).
- **Partial Unique Index:** `idx_bike_image_cover` enforces that a bike can have at most one cover image (`isCover = true`).
- **Financial Relation Protection:** Foreign keys on `Purchase`, `Sale`, `PurchasePayment`, `SalePayment`, `Expense`, `CustomerIdentity`, `CustomerBankAccount`, `CustomerDocument`, `CustomerAccount`, `BikeDocument`, and `BikeStatusHistory` use `onDelete: Restrict`. Financial records can never be cascade-deleted.
- **Mandatory Runtime Integrity Test Suite (`pnpm db:test-integrity`):** Executes 37 database assertions inside a rolled-back transaction during local verification and CI.

### Blocking CI Security Gate (`.github/workflows/ci.yml`)
- **Enforced Blocking Security Audit:** `pnpm audit --audit-level=high` runs in CI as a mandatory blocking gate.
- **No `continue-on-error`:** `continue-on-error: true`, shell exit-code suppression (`|| true`), or blanket advisory bypasses are strictly prohibited.
- **Root Workspace Dependency Overrides (`pnpm-workspace.yaml`):** Transitive dependency vulnerabilities in pnpm 11 are resolved via `overrides` in `pnpm-workspace.yaml` (`sharp: 0.35.3`, `postcss: 8.5.25`, `fast-uri: 3.1.5`).
- **CI Database Integration:** CI pipeline runs a disposable PostgreSQL 18 service container with automated migration deployment, schema drift check (`prisma migrate diff`), migration status check, double-pass seed idempotency check, runtime integrity test (`pnpm db:test-integrity`), unit auth & customer tests (`pnpm test`), admin auth integration tests (`pnpm test:admin-auth`), and customer integration tests (`pnpm test:customers`).
- **Environment Telemetry Disabled:** `NEXT_TELEMETRY_DISABLED: "1"` set in CI workflow.

### HTTP Response Headers (`next.config.ts`)
- `poweredByHeader: false`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, strict `Permissions-Policy`, `X-Robots-Tag: noindex, nofollow, noarchive` on `/admin` and `/api/*`, and production HSTS.

---

## 2. PLANNED & DEFERRED SECURITY CONTROLS

The following security controls are specified in architecture but deferred to future implementation phases:

### Runtime Authenticated Encryption Services (Deferred to Phase 3B)
- **AES-256-GCM Runtime Services:** Server-side encryption and decryption routines for customer NID numbers and bank account numbers.
- **Keyed HMAC Generator:** Server-side HMAC-SHA256 generator utilizing a secret server pepper stored outside the database.

### Private Object Storage & Upload Security (Deferred to Phase 3B+)
- **Storage Isolation & Signed URLs:** Sensitive customer documents (NID images, utility bills) stored in private object storage with short-lived signed URLs.

### Production Role Separation & Database Hardening (Deferred to Deployment Phase)
- **Least-Privilege Database Roles:** Local development uses a privileged `bike_admin` user for schema migration convenience. Production deployment must separate administrative migration roles from runtime least-privilege CRUD application roles.
- **Nonce-Based Content Security Policy (CSP):** A strict nonce-based Content Security Policy will be configured upon finalization of production hosting and asset domains.
