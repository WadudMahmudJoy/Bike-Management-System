# Sensitive Data Encryption Architecture & Security Design

**Business:** Sristy-Dristy Bike House (Legal Entity: Sristy-Dristy Enterprise)  
**Phase:** 3B1 — Encrypted Customer Identity & Optional Bank-Account Management Foundation

---

## 1. Overview & Threat Model

Phase 3B1 introduces versioned AES-256-GCM authenticated encryption for customer National ID (NID) numbers and optional customer bank account numbers, deterministic HMAC-SHA256 duplicate detection, password re-authenticated sensitive data reveals, dual-key global per-admin reveal rate limiting, fail-closed audit logging, and privacy-sanitized audit log trails.

The threat model protects customer identity and financial data against:
- Database compromise / SQL dump exposure (data is encrypted at rest using AES-256-GCM).
- Cross-record or cross-purpose ciphertext substitution attacks (ciphertext is cryptographically bound to customer ID, record ID, and purpose via GCM Authenticated Additional Data [AAD]).
- Admin session hijacking / unauthorized reveals (plaintext reveals require active session + password re-authentication).
- Key reuse / single key compromise (active encryption key is strictly separated from the lookup HMAC key).
- Distributed IP brute-force attempts (reveal throttling tracks primary global per-admin key `sensitive-reveal:admin:<adminId>`).

---

## 2. Cryptographic Envelope & Key Management

### AES-256-GCM Authenticated Encryption
- **Algorithm:** `aes-256-gcm` via Node.js `node:crypto`.
- **Key Requirement:** Base64-encoded 32-byte key (`SENSITIVE_DATA_ENCRYPTION_KEY_V1`).
- **Initialization Vector (IV):** Cryptographically random 12-byte IV generated per operation via `crypto.randomBytes(12)`.
- **Authentication Tag:** 16-byte authentication tag via `cipher.getAuthTag()`.
- **Envelope Structure:**
  ```ts
  export type EncryptedEnvelope = {
    ciphertext: string; // Base64
    iv: string;         // Base64 (12 bytes)
    authTag: string;    // Base64 (16 bytes)
    keyVersion: number; // e.g. 1
  };
  ```

### Authenticated Additional Data (AAD) Canonical Binding
All ciphertexts are cryptographically bound to their record context:
`bike-management-system|sensitive:v1|<PURPOSE>|customer:<customerId>|record:<recordId>`
- NID Purpose: `CUSTOMER_NID`
- Bank Account Purpose: `CUSTOMER_BANK_ACCOUNT_NUMBER`

---

## 3. Deterministic HMAC-SHA256 Duplicate Lookup

- **Lookup Key:** Base64-encoded 32-byte key (`SENSITIVE_DATA_LOOKUP_HMAC_KEY`), strictly independent from encryption keys.
- **Canonical Message:** `bike-management-system|nid-lookup:v1|<NORMALIZED_NID>`
- **Output:** Lowercase hexadecimal string of exactly 64 characters (`^[a-f0-9]{64}$`).
- **Constraint:** Stored in `@unique` column `CustomerIdentity.nidNumberHmac`. Duplicate NIDs across active or archived customers are hard-blocked with zero exception.
- **Privacy Rule:** HMAC values are NEVER exposed in DTOs, actions, UI, or audit logs.

---

## 4. Password Re-Authentication & Dual Reveal Throttling

- **Re-Authentication:** Plaintext reveal requires valid admin session + current admin's Argon2id password verification.
- **Dual-Key Throttling (`AdminLoginThrottle`):**
  - Primary Global Key: `sensitive-reveal:admin:<adminId>`
  - Secondary Network Key: `sensitive-reveal:admin-ip:<adminId>:<clientIp>`
- **Policy:** 5 failures within 15 minutes blocks reveals for 15 minutes. Either blocked key rejects reveal requests.
- **Fail-Closed Sequence:** Session check -> Dual throttle check -> Argon2id password verify -> Decrypt -> Write AuditLog -> Return plaintext. If AuditLog insertion fails, reveal operation aborts immediately and returns ZERO plaintext.
- **Client Auto-Clear:** Plaintext visible only in requesting component for maximum 30 seconds; auto-cleared on timer expiry, "Hide now" click, tab hide (`document.hidden`), or unmount.

---

## 5. Database Schema & Invariants (`20260805191700_phase3b1_sensitive_data_invariants`)

- `CustomerIdentity`: `keyVersion` is nullable `Int?`. `PENDING` status requires ALL sensitive fields (`encryptedNidNumber`, `encryptionIv`, `authTag`, `keyVersion`, `nidNumberHmac`, `lastFour`, `submittedAt`, `verifiedAt`, `verifiedByAdminId`) to be `NULL`. Non-PENDING requires complete 7-field encryption/HMAC bundle and 64-char hex HMAC format check.
- `CustomerBankAccount`: Complete 5-field encryption bundle (`encryptedAccountNumber`, `encryptionIv`, `authTag`, `keyVersion`, `accountNumberLastFour`) is NOT NULL on all rows.
