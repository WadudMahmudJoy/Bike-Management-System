# Customer Management System Architecture & Technical Specification

**Business Entity:** Sristy-Dristy Bike House (Legal: Sristy-Dristy Enterprise)  
**Phase:** 3A, 3A.1, & 3A.2 — Customer Core Management, Customer Roles, Controlled Duplicate Detection, Search, Archiving, Audit History, Security Corrections, Data Minimization, and Premium Admin UI

---

## 1. Overview & Business Requirements

Phase 3A, 3A.1, and 3A.2 implement customer profile management for dealership operations. It enables administrators to create, update, search, filter, and archive customer business records while enforcing phone normalization, controlled duplicate handling, audit tracking, error sanitization, non-throwing filter validation, payload minimization, and optimistic concurrency protection.

### Scope Boundaries
- **Included (Phase 3A, 3A.1, & 3A.2):** Core profile fields, Bangladesh phone normalization (`+8801XXXXXXXXX`), multi-role assignment (`BUYER`, `SELLER`, `POTENTIAL_BUYER`, `POTENTIAL_SELLER`, `BIKE_REQUESTER`), controlled duplicate phone warnings, phone-change-only duplicate checks, server-side duplicate confirmation rechecking, mandatory concurrency timestamps (`expectedUpdatedAt`), domain error sanitization, non-throwing filter parsing (`parseCustomerFilters`), edit payload minimization (`CustomerEditDTO`), creator admin email exclusion, `requireAdmin()` on all page routes and server actions, submission pending-state guards, `PENDING` NID status default, soft-archiving (`isArchived`), masked contact display in list views, full contact display in authenticated detail views, privacy-sanitized AuditLog entries, and premium dark admin UI.
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

## 4. Controlled Duplicate-Phone Workflow & Phone-Change Check

Phone numbers are not globally unique in the database to accommodate family members sharing a primary mobile line.

### Phone-Change-Only Duplicate Detection
1. **Unchanged Phone Edits:** When updating an existing customer record without changing the primary phone number (`existing.phoneNormalized === phoneNormalized`), duplicate checking is skipped entirely. Updates to full name, address, roles, email, or internal notes proceed immediately without requiring duplicate confirmation.
2. **Phone Changes & Creation:** When creating a customer or changing an existing customer's primary phone number, duplicate detection executes.
3. **Structured Warning:** If matching records exist and `confirmDuplicate` is `false`, creation/update stops and returns a structured warning containing matching customer codes, names, masked phones, roles, and archive states.
4. **Confirmation & Server Recheck:** When `confirmDuplicate` is `true`, the server re-queries duplicates within the transaction and compares the current duplicate ID set with `expectedDuplicateCustomerIds`. Submission proceeds only if the set matches. If matching duplicate records changed in the interim, `DUPLICATE_SET_CHANGED` is returned with a refreshed warning.
5. **Audit Event:** Duplicate override confirmations are logged in `AuditLog` metadata (`duplicatePhoneConfirmed: true`).

---

## 5. Optimistic Concurrency & Archiving

### Mandatory Optimistic Concurrency Control
Updates, archives, and restores require a valid ISO `expectedUpdatedAt` timestamp parameter and execute atomic PostgreSQL `UPDATE` queries matching `id`, `updatedAt`, and archive state:
```ts
const updateResult = await tx.customer.updateMany({
  where: { id, isArchived: false, updatedAt: expectedDate },
  data: { ... },
});
if (updateResult.count !== 1) {
  return { success: false, error: "This customer record was modified by another administrator. Please refresh and try again." };
}
```

### Soft-Archiving Policy
- Physical `DELETE` operations on `Customer` records are prohibited.
- `archiveCustomer` sets `isArchived: true` and logs `CUSTOMER_ARCHIVED`.
- `restoreCustomer` sets `isArchived: false` and logs `CUSTOMER_RESTORED`.
- Archived records remain searchable via the `archiveFilter: "archived"` filter and continue to trigger duplicate phone warnings.

---

## 6. Security, Authorization, & Data Minimization Rules

### Explicit Page & Action Authorization
- All customer Server Actions call `requireAdmin()`.
- Every customer route page (`/admin/customers`, `/admin/customers/new`, `/admin/customers/[id]`, `/admin/customers/[id]/edit`) calls `await requireAdmin();` before parameter parsing or database queries. Unauthenticated requests are redirected at the server component level before touching database models.

### Non-Throwing Bounded Filter Parsing (`parseCustomerFilters`)
- Customer list queries use `parseCustomerFilters(params)`.
- Search queries over 100 characters are capped to 100 characters (`substring(0, 100)`) without throwing Zod errors.
- Invalid page numbers default safely to 1; invalid limits cap at max 100; invalid roles, NID statuses, or archive filters fall back to safe defaults without causing HTTP 500 errors.

### Minimal Client Edit Payload (`CustomerEditDTO`)
- The edit page converts `CustomerDetailDTO` to `CustomerEditDTO` via `mapDetailToEditDTO()`.
- Unneeded client fields (`auditHistory`, `createdByAdmin`, `phoneNormalized`, `whatsappNormalized`, `nidStatus`, `isArchived`, `customerCode`) are stripped from `CustomerForm` props.
- Creator admin queries select only `{ id, name }`, excluding email addresses.

### Submission Pending-State Protection
- `CustomerForm` guards `handleSubmit` against re-entry while `isSubmitting` is true.
- Both primary submit buttons and duplicate-confirmation modal buttons are disabled with pending labels (`"Creating..."`, `"Saving..."`, `"Processing..."`) during pending network requests.
