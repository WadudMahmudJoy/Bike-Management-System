# Database Design Document

## Overview

This document specifies the authoritative database design for the **Bike Management System** (Customer-facing name: **Sristy-Dristy Bike House**, Legal name: **Sristy-Dristy Enterprise**).

The target database is **PostgreSQL 18**, accessed via **Prisma ORM 7** (`@prisma/adapter-pg`).

> **IMPLEMENTED IN PHASE 1:** All 26 Prisma business models, 25 enum groups, custom check constraints, partial unique cover-image index (`idx_bike_image_cover`), and database-level immutability triggers are fully implemented in `prisma/schema.prisma` and applied via initial migration `20260801174101_init_dealership_schema`.

---

## Implemented Entities & Schema Specification

### 1. Administration & Security

- **AdminUser**
  - `id`: UUID (Primary Key)
  - `email`: String (Unique, normalized lower-case)
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

- **CustomerAccount** (Future Phase 12 - Optional)
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Unique Foreign Key -> `Customer.id`, `onDelete: Restrict`)
  - `phoneNormalized`: String (Unique)
  - `email`: String (Unique, Nullable)
  - `passwordHash`: String (Nullable)
  - `phoneVerifiedAt`: Timestamp (UTC, Nullable)
  - `emailVerifiedAt`: Timestamp (UTC, Nullable)
  - `status`: Enum (`PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `CLOSED`)
  - `lastLoginAt`: Timestamp (UTC, Nullable)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

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
  - *No Circular FK:* `Bike` does NOT store `purchaseId`. Relationship to purchase is authoritative via `Purchase.bikeId`.

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
  - *Partial Unique Index:* `idx_bike_image_cover` enforces max 1 cover image per bike (`WHERE isCover = true`).

- **BikeCondition**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`, `onDelete: Cascade`)
  - `component`: Enum (`ENGINE`, `BODY`, `TYRES`, `BATTERY`, `ELECTRICAL`, `BRAKES`, `SUSPENSION`, `TRANSMISSION`, `OTHER`)
  - `rating`: Enum (`EXCELLENT`, `GOOD`, `FAIR`, `NEEDS_ATTENTION`, `UNKNOWN`)
  - `notes`: String (Nullable)
  - `inspectedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `inspectedAt`: Timestamp (UTC)
  - *Constraint:* Unique pair `(bikeId, component)`

- **BikeDocument**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`, `onDelete: Restrict`)
  - `documentType`: Enum (`REGISTRATION`, `TAX_TOKEN`, `FITNESS`, `OWNERSHIP_TRANSFER`, `PURCHASE_RECEIPT`, `SERVICE_HISTORY`, `OTHER`)
  - `status`: Enum (`PENDING`, `SUBMITTED`, `VERIFIED`, `NEEDS_CORRECTION`, `NOT_AVAILABLE`)
  - `privateStorageKey`: String (Nullable)
  - `expiryDate`: Timestamp (UTC, Nullable)
  - `verifiedAt`: Timestamp (UTC, Nullable)
  - `verifiedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `notes`: String (Nullable)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

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

### 4. Purchasing (Shop Buys Bike From Seller)

- **Purchase**
  - `id`: UUID (Primary Key)
  - `purchaseNumber`: String (Unique)
  - `bikeId`: UUID (Unique Foreign Key -> `Bike.id`, `onDelete: Restrict`, Authoritative)
  - `sellerId`: UUID (Foreign Key -> `Customer.id`, `onDelete: Restrict`)
  - `purchaseDate`: Timestamp (UTC)
  - `agreedPrice`: Decimal (14, 2)
  - `sellerPaymentDueDate`: Timestamp (UTC, Nullable)
  - `status`: Enum (`DRAFT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`)
  - `documentStatus`: Enum (`PENDING`, `SUBMITTED`, `VERIFIED`, `NEEDS_CORRECTION`, `NOT_AVAILABLE`)
  - `ownershipTransferStatus`: Enum (`NOT_STARTED`, `PENDING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`)
  - `confirmedAt`: Timestamp (UTC, Nullable)
  - `completedAt`: Timestamp (UTC, Nullable)
  - `cancelledAt`: Timestamp (UTC, Nullable)
  - `cancellationReason`: String (Nullable)
  - `notes`: String (Nullable)
  - `createdByAdminId`: UUID (Foreign Key -> `AdminUser.id`, `onDelete: Restrict`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *No Stored Remaining Payable:* Seller payable is computed dynamically server-side.

- **PurchasePayment** (Shop pays money OUT to seller)
  - `id`: UUID (Primary Key)
  - `purchaseId`: UUID (Foreign Key -> `Purchase.id`, `onDelete: Restrict`)
  - `amount`: Decimal (14, 2)
  - `paidAt`: Timestamp (UTC)
  - `paymentMethod`: Enum (`CASH`, `BANK_TRANSFER`, `BKASH`, `NAGAD`, `ROCKET`, `CHEQUE`, `MIXED`, `OTHER`)
  - `referenceNumber`: String (Nullable)
  - `receiptNumber`: String (Unique)
  - `notes`: String (Nullable)
  - `createdByAdminId`: UUID (Foreign Key -> `AdminUser.id`, `onDelete: Restrict`)
  - `isVoided`: Boolean (Default: `false`)
  - `voidedAt`: Timestamp (UTC, Nullable)
  - `voidedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `voidReason`: String (Nullable)
  - `createdAt`: Timestamp (UTC)
  - *Trigger Protection:* `fn_prevent_purchase_payment_tampering` blocks `DELETE`, blocks `UPDATE` on core fields, and restricts void transitions.

---

### 5. Sales (Shop Sells Bike To Buyer)

- **Sale**
  - `id`: UUID (Primary Key)
  - `saleNumber`: String (Unique)
  - `bikeId`: UUID (Unique Foreign Key -> `Bike.id`, `onDelete: Restrict`)
  - `buyerId`: UUID (Foreign Key -> `Customer.id`, `onDelete: Restrict`)
  - `saleDate`: Timestamp (UTC)
  - `listedPrice`: Decimal (14, 2)
  - `discountAmount`: Decimal (14, 2) (Default: `0.00`)
  - `finalPrice`: Decimal (14, 2)
  - `dueDate`: Timestamp (UTC, Nullable)
  - `paymentTerms`: String (Nullable)
  - `status`: Enum (`DRAFT`, `RESERVED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`)
  - `documentStatus`: Enum (`PENDING`, `SUBMITTED`, `VERIFIED`, `NEEDS_CORRECTION`, `NOT_AVAILABLE`)
  - `ownershipTransferStatus`: Enum (`NOT_STARTED`, `PENDING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`)
  - `confirmedAt`: Timestamp (UTC, Nullable)
  - `completedAt`: Timestamp (UTC, Nullable)
  - `cancelledAt`: Timestamp (UTC, Nullable)
  - `cancellationReason`: String (Nullable)
  - `notes`: String (Nullable)
  - `createdByAdminId`: UUID (Foreign Key -> `AdminUser.id`, `onDelete: Restrict`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *No Stored Remaining Due:* Buyer due is computed dynamically server-side.

- **SalePayment** (Shop receives money IN from buyer)
  - `id`: UUID (Primary Key)
  - `saleId`: UUID (Foreign Key -> `Sale.id`, `onDelete: Restrict`)
  - `amount`: Decimal (14, 2)
  - `receivedAt`: Timestamp (UTC)
  - `paymentMethod`: Enum (`CASH`, `BANK_TRANSFER`, `BKASH`, `NAGAD`, `ROCKET`, `CHEQUE`, `MIXED`, `OTHER`)
  - `referenceNumber`: String (Nullable)
  - `receiptNumber`: String (Unique)
  - `notes`: String (Nullable)
  - `receivedByAdminId`: UUID (Foreign Key -> `AdminUser.id`, `onDelete: Restrict`)
  - `isVoided`: Boolean (Default: `false`)
  - `voidedAt`: Timestamp (UTC, Nullable)
  - `voidedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `voidReason`: String (Nullable)
  - `createdAt`: Timestamp (UTC)
  - *Trigger Protection:* `fn_prevent_sale_payment_tampering` blocks `DELETE`, blocks `UPDATE` on core fields, and restricts void transitions.

---

### 6. Operations, Offers & Requests

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
  - `bikeId`: UUID (Nullable Foreign Key -> `Bike.id`, `onDelete: SetNull`)
  - `purchaseId`: UUID (Nullable Foreign Key -> `Purchase.id`, `onDelete: SetNull`)
  - `saleId`: UUID (Nullable Foreign Key -> `Sale.id`, `onDelete: SetNull`)
  - `recordedByAdminId`: UUID (Foreign Key -> `AdminUser.id`, `onDelete: Restrict`)
  - `isVoided`: Boolean (Default: `false`)
  - `voidedAt`: Timestamp (UTC, Nullable)
  - `voidedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `voidReason`: String (Nullable)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **Offer**
  - `id`: UUID (Primary Key)
  - `title`: String
  - `description`: String
  - `offerType`: Enum (`FIXED_DISCOUNT`, `PERCENTAGE_DISCOUNT`, `FIXED_PRICE`)
  - `value`: Decimal (14, 2)
  - `startDate`: Timestamp (UTC)
  - `endDate`: Timestamp (UTC)
  - `isActive`: Boolean (Default: `true`)
  - `isFeaturedOnHome`: Boolean (Default: `false`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **OfferBike** (Relational join entity replacing array-based IDs)
  - `id`: UUID (Primary Key)
  - `offerId`: UUID (Foreign Key -> `Offer.id`, `onDelete: Cascade`)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`, `onDelete: Cascade`)
  - `customOfferPrice`: Decimal (14, 2, Nullable)
  - `createdAt`: Timestamp (UTC)
  - *Constraint:* Unique pair `(offerId, bikeId)`

- **BikeRequest**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Nullable Foreign Key -> `Customer.id`, `onDelete: SetNull`)
  - `requesterName`: String
  - `requesterPhoneNormalized`: String
  - `preferredBrand`: String
  - `preferredModel`: String
  - `minimumYear`: Integer (Nullable)
  - `maximumYear`: Integer (Nullable)
  - `minimumBudget`: Decimal (14, 2, Nullable)
  - `maximumBudget`: Decimal (14, 2, Nullable)
  - `maximumMileageKm`: Integer (Nullable)
  - `preferredColor`: String (Nullable)
  - `requiredBy`: Timestamp (UTC, Nullable)
  - `paymentPreference`: Enum (`CASH`, `INSTALLMENT`, `DUE`, `NEGOTIABLE`, `OTHER`, Nullable)
  - `notes`: String (Nullable)
  - `requestStatus`: Enum (`NEW`, `CONTACTED`, `SEARCHING`, `MATCH_FOUND`, `CUSTOMER_NOTIFIED`, `COMPLETED`, `CANCELLED`)
  - `contactStatus`: Enum (`NOT_CONTACTED`, `CONTACTED`, `FOLLOW_UP_REQUIRED`, `UNREACHABLE`, `CLOSED`)
  - `assignedAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **SellBikeRequest**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Nullable Foreign Key -> `Customer.id`, `onDelete: SetNull`)
  - `sellerName`: String
  - `sellerPhoneNormalized`: String
  - `preferredContactMethod`: Enum (`PHONE`, `WHATSAPP`, `EMAIL`)
  - `brand`: String
  - `model`: String
  - `variant`: String (Nullable)
  - `modelYear`: Integer (Nullable)
  - `registrationYear`: Integer (Nullable)
  - `mileageKm`: Integer (Nullable)
  - `expectedPrice`: Decimal (14, 2, Nullable)
  - `location`: String
  - `documentNotes`: String (Nullable)
  - `knownProblems`: String (Nullable)
  - `status`: Enum (`NEW`, `REVIEWING`, `CONTACTED`, `INSPECTION_SCHEDULED`, `ACCEPTED`, `REJECTED`, `COMPLETED`, `CANCELLED`)
  - `assignedAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **SellBikeRequestImage** (Relational entity replacing array-based image paths)
  - `id`: UUID (Primary Key)
  - `sellBikeRequestId`: UUID (Foreign Key -> `SellBikeRequest.id`, `onDelete: Cascade`)
  - `storageKey`: String
  - `displayOrder`: Integer (Default: `0`)
  - `createdAt`: Timestamp (UTC)

- **Inquiry**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Nullable Foreign Key -> `Customer.id`, `onDelete: SetNull`)
  - `bikeId`: UUID (Nullable Foreign Key -> `Bike.id`, `onDelete: SetNull`)
  - `requesterName`: String
  - `phoneNormalized`: String
  - `message`: String
  - `source`: Enum (`WEBSITE`, `WHATSAPP`, `PHONE`, `FACEBOOK`, `WALK_IN`, `OTHER`)
  - `status`: Enum (`NEW`, `CONTACTED`, `INSPECTION_BOOKED`, `NEGOTIATING`, `COMPLETED`, `NOT_INTERESTED`, `CLOSED`)
  - `assignedAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **InspectionBooking**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Nullable Foreign Key -> `Customer.id`, `onDelete: SetNull`)
  - `bikeId`: UUID (Nullable Foreign Key -> `Bike.id`, `onDelete: SetNull`)
  - `requesterName`: String
  - `phoneNormalized`: String
  - `requestedAt`: Timestamp (UTC)
  - `confirmedAt`: Timestamp (UTC, Nullable)
  - `status`: Enum (`REQUESTED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`)
  - `assignedAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`, `onDelete: SetNull`)
  - `notes`: String (Nullable)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **ShopSetting**
  - `id`: UUID (Primary Key)
  - `key`: String (Unique)
  - `value`: String (Nullable)
  - `updatedAt`: Timestamp (UTC)

---

## Core Database Design Rules

### 1. Financial Settlement & Arithmetic
- **Buyer Outstanding Due:** Computed dynamically server-side:
  $$\text{Buyer Due} = \text{Sale.finalPrice} - \sum (\text{Valid SalePayment.amount WHERE isVoided = false})$$
- **Seller Outstanding Payable:** Computed dynamically server-side:
  $$\text{Seller Payable} = \text{Purchase.agreedPrice} - \sum (\text{Valid PurchasePayment.amount WHERE isVoided = false})$$
- **No Stored Balances:** `remainingDue` and `remainingPayable` are NOT stored as editable database columns to prevent balance drift.
- **No Floating-Point Money:** All financial calculations use PostgreSQL `DECIMAL(14, 2)`. Floating-point arithmetic (`number` in JS) is strictly prohibited for monetary calculations.

### 2. Payment Auditing & Immutability
- Posted `PurchasePayment` and `SalePayment` records are append-only ledgers enforced by database triggers.
- Deletions are blocked by `fn_prevent_purchase_payment_tampering` and `fn_prevent_sale_payment_tampering`.
- Core financial fields cannot be updated. Corrections require an explicit void operation (`isVoided = true`, `voidedAt`, `voidedByAdminId`, and `voidReason`).

### 3. Public Status vs. Financial Status
- `Bike.status` (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`) dictates public catalogue visibility.
- A bike may be publicly marked `SOLD` as soon as a `Sale` agreement is confirmed, even while buyer payments remain pending.

### 4. NID Verification Lifecycle
- NID status transitions: `PENDING` -> `SUBMITTED` -> `VERIFIED` (or `NEEDS_CORRECTION`).
- `PENDING` is permitted during customer creation, public enquiries, bike requests, reservations, draft purchases/sales, and initial deposit payments.
- Final transaction document completion requires minimum `SUBMITTED`.
- Ownership transfer completion requires `VERIFIED`.

### 5. Controlled Phone Handling
- Customer phone numbers are normalized (Bangladesh format `+8801...`).
- Phone numbers are **not** strictly unique globally, allowing family members to share a phone number.
