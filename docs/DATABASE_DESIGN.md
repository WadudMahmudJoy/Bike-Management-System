# Database Design Document

## Overview

This document specifies the authoritative database design for the **Bike Management System** (Customer-facing name: **Sristy-Dristy Bike House**, Legal name: **Sristy-Dristy Enterprise**).

The target database is **PostgreSQL 18**, accessed via **Prisma ORM 7** (`@prisma/adapter-pg`).

> **IMPLEMENTED IN PHASE 1 & PHASE 1.1:** All 26 Prisma business models, 25 enum groups, custom check constraints, partial unique cover-image index (`idx_bike_image_cover`), normalized admin email, and engine-level payment/expense immutability triggers are implemented in `prisma/schema.prisma` and applied via initial migration `20260801174101_init_dealership_schema` and corrective migration `20260802000215_phase1_integrity_corrections`.

---

## Implemented Entities & Schema Specification

### 1. Administration & Security

- **AdminUser**
  - `id`: UUID (Primary Key)
  - `email`: String (Display email)
  - `normalizedEmail`: String (Unique, canonical lower-case)
  - `passwordHash`: String (Argon2id hash)
  - `name`: String
  - `role`: Enum (`OWNER`, `ADMIN`)
  - `isActive`: Boolean (Default: `true`)
  - `lastLoginAt`: Timestamp (UTC, Nullable)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **AdminSession**
  - `id`: UUID (Primary Key)
  - `adminUserId`: UUID (Foreign Key -> `AdminUser.id`, `onDelete: Restrict`)
  - `sessionTokenHash`: String (Unique, SHA-256 hash of raw session token)
  - `expiresAt`: Timestamp (UTC)
  - `revokedAt`: Timestamp (UTC, Nullable)
  - `ipAddress`: String (Nullable, max 45 chars)
  - `userAgent`: String (Nullable)
  - `createdAt`: Timestamp (UTC)

- **AuditLog**
  - `id`: UUID (Primary Key)
  - `adminUserId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `action`: String (e.g., `CREATE_SALE`, `VOID_PAYMENT`)
  - `entityType`: String (e.g., `Sale`, `PurchasePayment`)
  - `entityId`: String
  - `previousValue`: JSON (Nullable, redacted of sensitive fields)
  - `newValue`: JSON (Nullable, redacted of sensitive fields)
  - `ipAddress`: String (Nullable)
  - `requestCorrelationId`: String (Nullable)
  - `createdAt`: Timestamp (UTC)
  - *Trigger Protection:* Append-only (`fn_prevent_audit_log_tampering` blocks `UPDATE` and `DELETE`).

---

### 2. Customer Management

- **Customer**
  - `id`: UUID (Primary Key)
  - `customerCode`: String (Unique, Nullable)
  - `fullName`: String
  - `fatherName`: String (Nullable)
  - `phone`: String (Normalized Bangladesh format)
  - `phoneNormalized`: String (Indexed)
  - `whatsappNumber`: String (Nullable)
  - `whatsappNormalized`: String (Nullable)
  - `email`: String (Nullable)
  - `address`: String (Nullable until transaction completion)
  - `emergencyContact`: String (Nullable)
  - `internalNotes`: String (Nullable, Admin-only)
  - `isArchived`: Boolean (Default: `false`)
  - `createdByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **CustomerRole**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Foreign Key -> `Customer.id`, `onDelete: Cascade`)
  - `role`: Enum (`BUYER`, `SELLER`, `POTENTIAL_BUYER`, `POTENTIAL_SELLER`, `BIKE_REQUESTER`)
  - `assignedAt`: Timestamp (UTC)
  - *Constraint:* Unique pair `(customerId, role)`

- **CustomerIdentity**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Unique Foreign Key -> `Customer.id`, `onDelete: Restrict`)
  - `nidStatus`: Enum (`PENDING`, `SUBMITTED`, `VERIFIED`, `NEEDS_CORRECTION`)
  - `encryptedNidNumber`: String (Authenticated AES-256-GCM encrypted string, Nullable)
  - `encryptionIv`: String (Nullable)
  - `authTag`: String (Nullable)
  - `keyVersion`: Integer (Default: `1`)
  - `nidNumberHmac`: String (Unique, Nullable keyed HMAC-SHA256)
  - `lastFour`: String (Nullable)
  - `submittedAt`: Timestamp (UTC, Nullable)
  - `verifiedAt`: Timestamp (UTC, Nullable)
  - `verifiedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `notes`: String (Nullable)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *Constraints:* `keyVersion > 0`, encryption bundle completeness, `lastFour` exact length 4, `VERIFIED` requires `verifiedAt` and `verifiedByAdminId`.

- **CustomerBankAccount**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Foreign Key -> `Customer.id`, `onDelete: Restrict`)
  - `bankName`: String
  - `accountHolderName`: String
  - `branchName`: String (Nullable)
  - `encryptedAccountNumber`: String (Nullable)
  - `encryptionIv`: String (Nullable)
  - `authTag`: String (Nullable)
  - `keyVersion`: Integer (Default: `1`)
  - `accountNumberLastFour`: String (Nullable)
  - `routingNumber`: String (Nullable)
  - `mobileBankingProvider`: String (Nullable)
  - `mobileBankingNumber`: String (Nullable)
  - `isDefault`: Boolean (Default: `false`)
  - `isActive`: Boolean (Default: `true`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *Constraints:* `keyVersion > 0`, encryption bundle completeness, `accountNumberLastFour` exact length 4.

- **CustomerDocument**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Foreign Key -> `Customer.id`, `onDelete: Restrict`)
  - `documentType`: Enum (`NID_FRONT`, `NID_BACK`, `BANK_DOCUMENT`, `SALE_AGREEMENT`, `PURCHASE_AGREEMENT`, `OTHER`)
  - `storageKey`: String
  - `originalFileName`: String
  - `mimeType`: String
  - `fileSize`: Integer
  - `status`: Enum (`PENDING`, `SUBMITTED`, `VERIFIED`, `NEEDS_CORRECTION`, `NOT_AVAILABLE`)
  - `notes`: String (Nullable)
  - `uploadedAt`: Timestamp (UTC)
  - `verifiedAt`: Timestamp (UTC, Nullable)
  - `verifiedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - *Constraint:* `fileSize > 0`.

---

### 3. Bike Inventory

- **Bike**
  - `id`: UUID (Primary Key)
  - `stockCode`: String (Unique)
  - `slug`: String (Unique)
  - `brand`: String
  - `model`: String
  - `variant`: String (Nullable)
  - `modelYear`: Integer
  - `registrationYear`: Integer (Nullable)
  - `engineCapacityCc`: Integer
  - `mileageKm`: Integer
  - `color`: String
  - `fuelType`: Enum (`PETROL`, `ELECTRIC`, `HYBRID`, `OTHER`)
  - `registrationNumber`: String (Unique, Nullable)
  - `ownershipCount`: Integer (Nullable)
  - `askingPrice`: Decimal (14, 2, Nullable)
  - `isNegotiable`: Boolean (Default: `true`)
  - `description`: String (Nullable)
  - `knownIssues`: String (Nullable)
  - `inspectionNotes`: String (Nullable)
  - `isFeatured`: Boolean (Default: `false`)
  - `status`: Enum (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`)
  - `publishedAt`: Timestamp (UTC, Nullable)
  - `archivedAt`: Timestamp (UTC, Nullable)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *Constraint:* `ownershipCount IS NULL OR ownershipCount >= 1`. No Circular FK.

- **BikeImage**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`, `onDelete: Cascade`)
  - `storageKey`: String
  - `publicUrl`: String (Nullable)
  - `altText`: String (Nullable)
  - `width`: Integer (Nullable)
  - `height`: Integer (Nullable)
  - `displayOrder`: Integer (Default: `0`)
  - `isCover`: Boolean (Default: `false`)
  - `createdAt`: Timestamp (UTC)
  - *Partial Unique Index:* `idx_bike_image_cover` enforces max 1 cover image per bike (`WHERE isCover = true`). `width > 0`, `height > 0`, `displayOrder >= 0`.

- **BikeCondition**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`, `onDelete: Cascade`)
  - `component`: Enum (`ENGINE`, `BODY`, `TYRES`, `BATTERY`, `ELECTRICAL`, `BRAKES`, `SUSPENSION`, `TRANSMISSION`, `OTHER`)
  - `rating`: Enum (`EXCELLENT`, `GOOD`, `FAIR`, `NEEDS_ATTENTION`, `UNKNOWN`)
  - `notes`: String (Nullable)
  - `inspectedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `inspectedAt`: Timestamp (UTC)

- **BikeDocument**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`, `onDelete: Restrict`)
  - `documentType`: Enum (`REGISTRATION`, `TAX_TOKEN`, `FITNESS`, `OWNERSHIP_TRANSFER`, `PURCHASE_RECEIPT`, `SERVICE_HISTORY`, `OTHER`)
  - `status`: Enum (`PENDING`, `SUBMITTED`, `VERIFIED`, `NEEDS_CORRECTION`, `NOT_AVAILABLE`)
  - `privateStorageKey`: String (Nullable)
  - `expiryDate`: Timestamp (UTC, Nullable)
  - `verifiedAt`: Timestamp (UTC, Nullable)
  - `verifiedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)

- **BikeStatusHistory**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`, `onDelete: Restrict`)
  - `previousStatus`: Enum (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`)
  - `newStatus`: Enum (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`)
  - `changedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `reason`: String
  - `changedAt`: Timestamp (UTC)
  - *Trigger Protection:* Append-only (`fn_prevent_bike_status_history_tampering` blocks `UPDATE` and `DELETE`).

---

### 4. Purchasing & Sales

- **PurchasePayment** & **SalePayment**
  - Immutability enforced by PostgreSQL functions `fn_prevent_purchase_payment_tampering` and `fn_prevent_sale_payment_tampering`.
  - Blocks `DELETE`, blocks `UPDATE` on core fields using `IS DISTINCT FROM`, requires unvoided start on `INSERT`, requires complete void metadata during one-way void transition (`isVoided = true`), and blocks unvoiding.

- **Sale**
  - *Constraints:* `listedPrice > 0`, `discountAmount >= 0`, `finalPrice >= 0`, `finalPrice = listedPrice - discountAmount`.

---

### 5. Operations & Expenses

- **Expense**
  - `id`: UUID (Primary Key)
  - `expenseNumber`: String (Unique)
  - `category`: Enum (`REPAIR`, `TRANSPORT`, `DOCUMENT_TRANSFER`, `MARKETING`, `UTILITIES`, `RENT`, `SALARY`, `OTHER`)
  - `amount`: Decimal (14, 2)
  - `incurredDate`: Timestamp (UTC)
  - `paymentMethod`: Enum (`CASH`, `BANK_TRANSFER`, `BKASH`, `NAGAD`, `ROCKET`, `CHEQUE`, `MIXED`, `OTHER`)
  - `referenceNumber`: String (Nullable)
  - `description`: String
  - `paidTo`: String (Nullable)
  - `receiptPath`: String (Nullable)
  - `bikeId`: UUID (Nullable Foreign Key -> `Bike.id`, `onDelete: Restrict`)
  - `purchaseId`: UUID (Nullable Foreign Key -> `Purchase.id`, `onDelete: Restrict`)
  - `saleId`: UUID (Nullable Foreign Key -> `Sale.id`, `onDelete: Restrict`)
  - `recordedByAdminId`: UUID (Foreign Key -> `AdminUser.id`, `onDelete: Restrict`)
  - `isVoided`: Boolean (Default: `false`)
  - `voidedAt`: Timestamp (UTC, Nullable)
  - `voidedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: Restrict`)
  - `voidReason`: String (Nullable)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *Trigger Protection:* `fn_prevent_expense_tampering` blocks `DELETE`, core `UPDATE`, and unvoiding.
