# Security Requirements

This document specifies the security controls, architecture, and requirements for the **Bike Management System** (Sristy-Dristy Bike House).

---

## 1. IMPLEMENTED IN PHASE 0.5

The following baseline security controls are active in the codebase:

### HTTP Response Headers (`next.config.ts`)
- **`poweredByHeader: false`**: Disables the `X-Powered-By: Next.js` header to obscure technology stack details.
- **`X-Content-Type-Options: nosniff`**: Prevents browsers from MIME-sniffing response content types.
- **`X-Frame-Options: DENY`**: Prevents clickjacking by blocking iframe embedding across all routes.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Protects sensitive path details in referrer headers when navigating cross-origin.
- **`Permissions-Policy`**: Restricts unused browser features (`camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`).
- **`X-Robots-Tag: noindex, nofollow, noarchive`**: Configured on `/admin` and `/api/*` routes to instruct search crawlers not to index or archive management interfaces.
- **`Strict-Transport-Security` (HSTS)**: Configured dynamically to emit `max-age=63072000` exclusively in production (`NODE_ENV === "production"`). Does not include `includeSubDomains` or `preload`.

### API & Cache Protection (`src/app/api/health/route.ts`)
- `/api/health` response includes `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` and `X-Robots-Tag: noindex, nofollow, noarchive`.
- Endpoint returns minimal JSON (`status: "ok", service: "bike-management-system"`), explicitly exposing no environment variables, git commits, server paths, database status, or framework version numbers.

### Environment Variable & Git Hygiene (`.gitignore` & `.env.example`)
- `.env` files are excluded from Git via `.gitignore` (only non-secret template `.env.example` is tracked).
- Customer NID images (`*.nid.*`, `/nid-images/`, `/customer-documents/`), database dumps (`*.sql`, `*.dump`), local backups, and private uploads are excluded from Git.
- `packageManager` field locked to `pnpm@11.1.2` in `package.json`.

---

## 2. PLANNED FOR LATER PHASES

The following security controls are specified and planned for implementation in subsequent phases:

### Authentication Architecture (Phase 2 - Admin Shell)
- **Password Hashing:** Argon2id is locked as the password hashing algorithm. Plain-text passwords will never be logged or stored.
- **No Public Admin Registration:** Admin accounts can only be created via CLI seed scripts or by authorized Super Admins.
- **Session Tokens:** Session tokens are delivered exclusively via `HttpOnly`, `SameSite=Lax/Strict`, `Secure` cookies.
- **Token Hashing:** Server database (`AdminSession`) stores only SHA-256 hashes of session tokens (`sessionTokenHash`), never raw reusable session tokens.
- **Session Lifecycle:** Mandatory server-side session rotation and revocation on logout or timeout.
- **Login Rate Limiting:** Exponential backoff rate limiting per IP and per account on login endpoints.

### Server Authorization (Phase 2+)
- **Server-Side Enforcement:** Every Server Action, API endpoint, and page layout must enforce server-side authentication and role-based access control (RBAC). Hiding UI elements is for UX only and is never relied upon for security.
- **Robots & Hidden Routes:** `robots.txt` and `noindex` headers are search crawler directives, NOT access control. All protected endpoints must reject unauthorized requests with HTTP 401/403.

### Sensitive Field Encryption & Masking (Phase 3 - Customer Management)
- **Authenticated Encryption at Rest:** Customer NID numbers and bank account numbers will be encrypted using AES-256-GCM. Encryption keys will remain strictly outside the repository and database (environment configuration).
- **Encryption Key Rotation:** `keyVersion` metadata stored alongside encrypted payloads to support seamless key rotation.
- **Duplicate NID Lookup:** Uses a keyed HMAC-SHA256 hash (`nidNumberHmac`) of the normalized NID using a secret server pepper stored outside the database. Plain SHA hashes are prohibited.
- **UI Masking:** Admin UI renders only masked values (e.g., displaying only the last 4 digits of bank account numbers).
- **Log Redaction:** Password hashes, raw tokens, NID numbers, bank accounts, and full identity documents are redacted from application logs and `AuditLog` JSON payloads.

### Private Object Storage & Upload Security (Phase 3+)
- **Storage Isolation:** Sensitive customer documents (NID images, utility bills) are stored in private object storage, never in public web roots. Public bike images use separate public storage.
- **Upload Inspection:** Upload handlers validate extensions against strict whitelists, verify MIME types via magic-byte inspection, enforce size limits, generate UUID filenames, and block executables.
- **Signed URLs:** Access to private customer documents is granted exclusively via short-lived, time-limited signed URLs generated after server authorization.

### Database Least Privilege (Phase 1)
- Database connections use a least-privilege PostgreSQL role for normal runtime operations (CRUD), with a separate administrative user for migrations.

### Nonce-Based Content Security Policy (CSP)
- A strict, nonce-based Content Security Policy will be implemented after authentication, hosting, storage origins, and analytics providers are finalized. CSP is currently marked PLANNED to avoid unsafe inline overrides or broken Next.js hydration.

---

## 3. REQUIRED BEFORE PRODUCTION

Prior to launching to production, the following verification and deployment controls are mandatory:

1. **Domain & HTTPS Verification:** Confirm HTTPS is active and valid on the production domain before enforcing production HSTS headers.
2. **Secret Auditing:** Verify no real credentials, database strings, or API secrets exist in Git history, environment templates, or client bundles.
3. **Environment Indexing Validation:** Confirm `SITE_INDEXING_ENABLED` is `false` in staging/preview environments and enabled only on the live production domain.
4. **Backup & Restore Validation:** Execute an automated PostgreSQL database backup and perform a clean restore test on a separate staging instance.
5. **Dependency Audit:** Verify `pnpm audit --audit-level=high` returns zero unresolved high/critical vulnerabilities.
6. **Penetration & Authorization Sweep:** Perform an authorization check on every API route and Server Action to ensure unauthenticated users cannot access or mutate business data.
