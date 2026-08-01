# Security Requirements

This document specifies the security controls, architecture, and requirements for the **Bike Management System** (Sristy-Dristy Bike House).

---

## 1. IMPLEMENTED IN PHASE 0.5, PHASE 0.5.1, PHASE 0.5.2 & PHASE 1

The following baseline security and database controls are active in the codebase:

### Database Integrity & Engine-Level Security (Phase 1)
- **Database Engine Isolation:** Local PostgreSQL containerized using `postgres:18-alpine` in `compose.yaml` and bound strictly to `127.0.0.1:5434` (`localhost` loopback only). Public binding `0.0.0.0` is strictly forbidden.
- **Database Immutability Triggers (`migration.sql`):**
  - **`PurchasePayment` & `SalePayment` Triggers:** Block `DELETE` statements on payment records. Block `UPDATE` statements on core financial fields (`amount`, payment date, method, receipt number, creator). Restrict voiding to a one-way transition (`isVoided = true`) requiring `voidedAt`, `voidedByAdminId`, and a non-empty `voidReason`. Block unvoiding (`isVoided = false`).
  - **`AuditLog` & `BikeStatusHistory` Triggers:** Block both `UPDATE` and `DELETE` operations, enforcing strict append-only behavior at the database engine level.
- **Database CHECK Constraints:** Enforce nonnegative monetary values, positive purchase agreed prices, nonnegative sale prices (`finalPrice <= listedPrice`), valid year ranges (1900–2100), positive engine capacity, nonnegative mileage, valid budget ranges (`minimumBudget <= maximumBudget`), percentage discount limits (0–100), and internal void field metadata consistency.
- **Partial Unique Index:** `idx_bike_image_cover` enforces that a bike can have at most one cover image (`isCover = true`).
- **Financial Relation Protection:** Foreign keys on `Purchase`, `Sale`, `PurchasePayment`, `SalePayment`, `CustomerIdentity`, `CustomerBankAccount`, `CustomerDocument`, `CustomerAccount`, `BikeDocument`, and `BikeStatusHistory` use `onDelete: Restrict`. Financial records can never be cascade-deleted.
- **Identity & Bank Data Architecture:** Schema defines encrypted ciphertext fields (`encryptedNidNumber`, `encryptedAccountNumber`), IV nonces (`encryptionIv`), GCM auth tags (`authTag`), key versioning (`keyVersion`), last-four display fields (`lastFour`), and keyed HMAC-SHA256 search indexes (`nidNumberHmac`).

### Blocking CI Security Gate (`.github/workflows/ci.yml`)
- **Enforced Blocking Security Audit:** `pnpm audit --audit-level=high` runs in CI as a mandatory blocking gate.
- **No `continue-on-error`:** `continue-on-error: true`, shell exit-code suppression (`|| true`), or blanket advisory bypasses are strictly prohibited.
- **Root Workspace Dependency Overrides (`pnpm-workspace.yaml`):** Transitive dependency vulnerabilities in pnpm 11 are resolved via `overrides` in `pnpm-workspace.yaml` (`sharp: 0.35.3`, `postcss: 8.5.25`).
- **CI Database Integration:** CI pipeline runs a disposable PostgreSQL 18 service container with automated migration deployment, schema drift check (`prisma migrate diff`), status check, and idempotent seeding.
- **Environment Telemetry Disabled:** `NEXT_TELEMETRY_DISABLED: "1"` set in CI workflow.

### HTTP Response Headers (`next.config.ts`)
- `poweredByHeader: false`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, strict `Permissions-Policy`, `X-Robots-Tag: noindex, nofollow, noarchive` on `/admin` and `/api/*`, and production HSTS.

---

## 2. PLANNED & DEFERRED SECURITY CONTROLS

The following security controls are specified in architecture but deferred to future implementation phases:

### Authentication Architecture (Deferred to Phase 2)
- **Password Hashing:** Argon2id is locked as the password hashing algorithm. Plain-text passwords will never be logged or stored.
- **Session Tokens:** Delivered via `HttpOnly`, `SameSite=Lax/Strict`, `Secure` cookies. Database stores SHA-256 hashes (`sessionTokenHash`).
- **Session Lifecycle & Rate Limiting:** Session rotation, revocation, and exponential backoff rate limiting per IP and per account.

### Runtime Authenticated Encryption Services (Deferred to Phase 3)
- **AES-256-GCM Runtime Services:** Server-side encryption and decryption routines for customer NID numbers and bank account numbers.
- **Keyed HMAC Generator:** Server-side HMAC-SHA256 generator utilizing a secret server pepper stored outside the database.

### Private Object Storage & Upload Security (Deferred to Phase 3+)
- **Storage Isolation & Signed URLs:** Sensitive customer documents (NID images, utility bills) stored in private object storage with short-lived signed URLs.

### Production Role Separation & Database Hardening (Deferred to Deployment Phase)
- **Least-Privilege Database Roles:** Local development uses a privileged `bike_admin` user for schema migration convenience. Production deployment must separate administrative migration roles from runtime least-privilege CRUD application roles.
- **Nonce-Based Content Security Policy (CSP):** A strict nonce-based Content Security Policy will be configured upon finalization of production hosting and asset domains.
