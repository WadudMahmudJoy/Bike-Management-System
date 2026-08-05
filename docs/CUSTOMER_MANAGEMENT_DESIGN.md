# Customer Management System Architecture & Technical Specification

**Business Entity:** Sristy-Dristy Bike House (Legal: Sristy-Dristy Enterprise)  
**Phase:** 3A — Customer Core Management, Customer Roles, Controlled Duplicate Detection, Search, Archiving, Audit History, and Premium Admin UI

---

## 1. Overview & Business Requirements

Phase 3A implements customer profile management for dealership operations. It enables administrators to create, update, search, filter, and archive customer business records while enforcing phone normalization, controlled duplicate handling, audit tracking, and optimistic concurrency protection.

### Scope Boundaries
- **Included (Phase 3A):** Core profile fields, Bangladesh phone normalization (`+8801XXXXXXXXX`), multi-role assignment (`BUYER`, `SELLER`, `POTENTIAL_BUYER`, `POTENTIAL_SELLER`, `BIKE_REQUESTER`), controlled duplicate phone warnings, server-side duplicate confirmation rechecking, `PENDING` NID status default, soft-archiving (`isArchived`), masked contact display in list views, full contact display in authenticated detail views, privacy-sanitized AuditLog entries, and premium dark admin UI.
- **Excluded (Phase 3B & Later):** Raw NID collection, AES-256-GCM NID encryption, NID HMAC index, bank account numbers, banking document uploads, private object storage, customer login accounts (`CustomerAccount`), public customer registration, and bike/purchase/sales transactional logic.

---

## 2. Phone Normalization & Masking Policy

### Bangladesh Phone Normalization (`src/lib/customer/phone.ts`)
- Standardizes mobile numbers into canonical `+8801XXXXXXXXX` format (14 characters).
- Accepts forms: `01XXXXXXXXX`, `8801XXXXXXXXX`, `+8801XXXXXXXXX`, with spaces/dashes/parentheses stripped.
- Valid mobile operator prefixes: `013`, `014`, `015`, `016`, `017`, `018`, `019`.
- Malformed numbers, invalid prefixes, alpha characters, or improper lengths are rejected.

### Contact Masking Security Rules
- **Public & List Views:** Phone numbers are masked (`+880 17***-**78`).
- **Authenticated Detail & Edit Views:** Full phone numbers are visible to authenticated admins for operational necessity.
- **Audit Logs & Stack Traces:** Full phone numbers, WhatsApp numbers, email addresses, and internal notes are **never** logged to `AuditLog`, console outputs, or error responses.

---

## 3. Customer Code Generation

- **Format:** `CUS-XXXXXXXX` where `XXXXXXXX` consists of 8 characters derived from the 32-character unambiguous Crockford Base32 alphabet (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`).
- **Immutability:** Generated server-side upon creation; immutable thereafter.
- **Collision Resistance:** Enforced via a `@unique` database constraint and a bounded retry loop (up to 5 attempts).

---

## 4. Controlled Duplicate-Phone Workflow

Phone numbers are not globally unique in the database to accommodate family members sharing a primary mobile line.

1. **Normalization:** Input phone is normalized to `+8801XXXXXXXXX`.
2. **Duplicate Search:** Existing active and archived customers sharing the normalized phone are queried.
3. **Structured Warning:** If matching records exist and `confirmDuplicate` is `false`, creation/update stops and returns a structured warning containing matching customer codes, names, masked phones, roles, and archive states.
4. **Confirmation & Server Recheck:** When `confirmDuplicate` is `true`, the server re-queries duplicates and compares the current duplicate ID set with `expectedDuplicateCustomerIds`. Creation proceeds only if the set matches. If new duplicates appeared in the interim, a refreshed warning is returned.
5. **Audit Event:** Duplicate override confirmations are logged in `AuditLog` metadata (`duplicatePhoneConfirmed: true`).

---

## 5. Optimistic Concurrency & Archiving

### Optimistic Concurrency Control
Updates utilize atomic PostgreSQL `UPDATE` queries matching `id` and `expectedUpdatedAt`:
```ts
const updateResult = await tx.customer.updateMany({
  where: { id, updatedAt: expectedDate },
  data: { ... },
});
if (updateResult.count !== 1) {
  throw new Error("CONCURRENCY_CONFLICT: Record modified by another administrator.");
}
```

### Soft-Archiving Policy
- Physical `DELETE` operations on `Customer` records are prohibited.
- `archiveCustomer` sets `isArchived: true` and logs `CUSTOMER_ARCHIVED`.
- `restoreCustomer` sets `isArchived: false` and logs `CUSTOMER_RESTORED`.
- Archived records remain searchable via the `archiveFilter: "archived"` filter and continue to trigger duplicate phone warnings.

---

## 6. Data Access Layer & Security Rules

- **Server-Side Authorization:** Every mutation and query requires `requireAdmin()` (or `getAuthorizedAdmin()`). Client-provided admin IDs in `FormData` are strictly prohibited.
- **Privacy Sanitization:** Audit log entries record only non-sensitive field name summaries and metadata.
- **Query Bounds:** Customer search queries default to page size 20 (max 100) with deterministic sorting (`createdAt: "desc"`, `id: "desc"`).
