# Security Requirements

This document outlines the security architecture and requirements for the Sristy-Dristy Bike House (Bike Management System) application. It ensures a robust, secure environment for both public users and system administrators.

## Authentication
- **No public admin registration:** Admin accounts can only be created by existing administrators or via a secure database seed script during initialization.
- **Secure password hashing:** All passwords are hashed using bcrypt or argon2 with an appropriate cost factor before storage. Plain text passwords are never stored or logged.
- **Secure server-side sessions:** Sessions are managed securely on the server and stored in the database.
- **HttpOnly cookies:** Session tokens are delivered exclusively via HttpOnly cookies to prevent client-side JavaScript access (mitigating XSS attacks).
- **Secure cookie flag:** In production environments, the Secure flag is mandatory, ensuring cookies are only transmitted over HTTPS.
- **SameSite cookie attribute:** Cookies use `SameSite=Lax` or `Strict` to prevent Cross-Site Request Forgery (CSRF).
- **Login rate limiting:** Authentication endpoints implement rate limiting to restrict maximum login attempts per IP and per account, utilizing exponential backoff to thwart brute-force attacks.
- **Session expiration and renewal:** Sessions have a strict expiration time. Active sessions are renewed securely, while inactive sessions require re-authentication.
- **Logout behavior:** Explicit logout actions immediately invalidate the server-side session and clear the client-side cookie.

## Authorization
- **Server-side checks:** Authorization is verified on the server for every protected route, API endpoint, and server action. Client-side hiding is only for UI/UX and never relied upon for security.
- **Role-based access control (RBAC):** Access is granted based on specific admin roles (e.g., Super Admin, Sales Agent). Actions are restricted strictly to permitted roles.
- **Middleware-level auth checks:** Next.js middleware is employed to protect all admin route groups (`/admin/*`), ensuring unauthenticated users are redirected before any page rendering occurs.
- **API route protection:** All API routes validate session integrity and user roles before processing requests.

## Input Validation & CSRF
- **Zod validation:** All server-side inputs, including form submissions and API payloads, are strictly validated against predefined Zod schemas.
- **CSRF protection:** All state-changing operations (POST, PUT, DELETE) require CSRF protection mechanisms in addition to SameSite cookie configurations.
- **Safe error messages:** Error responses are sanitized to ensure they do not leak internal system details, stack traces, or database structures to the client.
- **SQL injection prevention:** All database queries are executed using Prisma ORM, which inherently utilizes parameterized queries to prevent SQL injection vulnerabilities.

## Security Headers
The application enforces strict security headers via Next.js configuration:
- **X-Content-Type-Options:** `nosniff` (Prevents MIME-type sniffing)
- **X-Frame-Options:** `DENY` (Prevents clickjacking by disabling iframe rendering)
- **Referrer-Policy:** `strict-origin-when-cross-origin` (Protects referrer data)
- **Content Security Policy (CSP):** A restrictive CSP is planned and enforced to allow resources only from trusted domains and prevent inline script execution.
- **Strict-Transport-Security (HSTS):** Enforced in production to guarantee HTTPS connections.

## File Upload Security
- **File type validation:** Uploads are strictly whitelisted to specific extensions (e.g., JPEG, PNG, PDF).
- **MIME type validation:** The actual file content and magic numbers are inspected to verify the MIME type, bypassing simple extension checks.
- **File size limits:** Strict, configurable maximum file sizes are enforced with reasonable defaults to prevent Denial of Service (DoS) via storage exhaustion.
- **Generated filenames:** User-provided filenames are completely discarded. The system generates secure, random filenames (e.g., UUIDs) for all uploads.
- **Executable blocking:** Executable files (e.g., .exe, .sh, .bat) are explicitly blocked.
- **Private object storage:** Sensitive documents such as NIDs and customer documents are stored in a private storage bucket inaccessible from the public internet.
- **Temporary signed URLs:** Authorized access to private documents is granted exclusively through short-lived, time-limited signed URLs.
- **Storage segregation:** Different document types (e.g., public bike images vs. private customer NIDs) are stored in separate paths or buckets with distinct access policies.

## Data Protection
- **Encryption at rest:** Highly sensitive fields, such as NID numbers and bank account numbers, are encrypted at rest within the PostgreSQL database.
- **Secure hashing for uniqueness:** To detect duplicate NIDs without exposing the raw value during searches, a deterministic secure hash of the NID is stored alongside the encrypted value.
- **Masked display:** Sensitive information is masked in the admin UI (e.g., displaying only the last four digits of a bank account or NID) to prevent shoulder surfing and accidental exposure.
- **Private file storage:** Customer documents are never served via public static URLs. Access requires authentication and authorization.
- **Test data integrity:** Development environments, seed scripts, and test fixtures contain exclusively synthetic, fake data. Real customer data is never used outside of production.

## Audit & Monitoring
- **Audit logging:** All significant data mutations (creates, updates, deletes) are logged with a timestamp, user ID, and the nature of the change.
- **Login monitoring:** Successful and failed login attempts are logged to monitor for suspicious activities.
- **Action logging:** Admin actions include records of previous and new values for critical business entities (e.g., price changes, status updates).
- **Log sanitization:** Logs are sanitized to ensure passwords, session tokens, NIDs, and other personally identifiable information (PII) are never written to log files.

## Database Security
- **Least-privilege access:** The application connects to PostgreSQL using a dedicated database user with the minimum required permissions (e.g., CRUD operations only, no schema modification rights).
- **Migration user:** A separate, highly privileged administrative user is utilized exclusively during deployment for schema migrations.
- **Encrypted backups:** Database backups are scheduled regularly, encrypted securely, and stored in a separate geographic location.
- **Restore testing:** Backup restoration procedures are tested on a regular schedule to guarantee data recoverability.
- **Credential management:** Database connection strings are stored securely in environment variables and are never hardcoded.

## Dependency & Deployment
- **Dependency auditing:** Regular security audits of third-party dependencies are conducted (e.g., using `pnpm audit` in CI/CD pipelines).
- **Git hygiene:** Private keys, certificates, and sensitive configuration files are strictly excluded from version control via `.gitignore`.
- **Environment variables:** `.env` files are never committed to the repository.
- **Code reviews:** All pull requests are evaluated against a security-focused code review checklist prior to merging.
