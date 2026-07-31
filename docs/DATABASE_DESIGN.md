# Database Design Document

## Overview

This document specifies the authoritative database design for the **Bike Management System** (Customer-facing name: **Sristy-Dristy Bike House**, Legal name: **Sristy-Dristy Enterprise**).

The target database is **PostgreSQL**, accessed via **Prisma ORM**.

> **DESIGN SPECIFICATION ONLY:** No Prisma business models or migrations are implemented in Phase 0 or Phase 0.5. All schema definitions in Phase 1 must adhere strictly to the rules and entities established in this document.

---

## Planned Entities & Schema Specification

### 1. Administration & Security

- **AdminUser**
  - `id`: UUID (Primary Key)
  - `email`: String (Unique, normalized lower-case)
  - `passwordHash`: String (Argon2id hash)
  - `name`: String
  - `role`: Enum (`SUPER_ADMIN`, `MANAGER`, `SALES_AGENT`)
  - `isActive`: Boolean (Default: `true`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **AdminSession**
  - `id`: UUID (Primary Key)
  - `adminUserId`: UUID (Foreign Key -> `AdminUser.id`)
  - `sessionTokenHash`: String (Unique, SHA-256 hash of raw session token)
  - `expiresAt`: Timestamp (UTC)
  - `createdAt`: Timestamp (UTC)
  - `ipAddress`: String (Nullable)
  - `userAgent`: String (Nullable)

- **AuditLog**
  - `id`: UUID (Primary Key)
  - `adminUserId`: UUID (Nullable Foreign Key -> `AdminUser.id`)
  - `action`: String (e.g., `CREATE_SALE`, `VOID_PAYMENT`)
  - `entityType`: String (e.g., `Sale`, `PurchasePayment`)
  - `entityId`: String
  - `previousValue`: JSON (Nullable, redacted of sensitive fields)
  - `newValue`: JSON (Nullable, redacted of sensitive fields)
  - `ipAddress`: String (Nullable)
  - `createdAt`: Timestamp (UTC)

---

### 2. Customer Management

- **Customer**
  - `id`: UUID (Primary Key)
  - `fullName`: String
  - `phone`: String (Normalized Bangladesh format, e.g., `+8801700000000`)
  - `whatsappNumber`: String (Nullable, normalized)
  - `email`: String (Nullable, normalized lower-case)
  - `fatherName`: String (Nullable)
  - `address`: String (Nullable until transaction completion)
  - `emergencyContact`: String (Nullable)
  - `internalNotes`: String (Nullable, Admin-only)
  - `nidStatus`: Enum (`PENDING`, `SUBMITTED`, `VERIFIED`, `NEEDS_CORRECTION`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **CustomerRole**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Foreign Key -> `Customer.id`)
  - `role`: Enum (`BUYER`, `SELLER`, `POTENTIAL_BUYER`, `POTENTIAL_SELLER`, `BIKE_REQUESTER`)
  - `assignedAt`: Timestamp (UTC)
  - *Constraint:* Unique pair `(customerId, role)`

- **CustomerIdentity**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Unique Foreign Key -> `Customer.id`)
  - `encryptedNidNumber`: String (Authenticated AES-256-GCM encrypted string)
  - `nidNumberHmac`: String (Indexed keyed HMAC-SHA256 for duplicate lookup using server pepper)
  - `keyVersion`: Integer (Encryption key version for key rotation)
  - `frontImagePath`: String (Nullable, private object storage path)
  - `backImagePath`: String (Nullable, private object storage path)
  - `verifiedAt`: Timestamp (UTC, Nullable)
  - `verifiedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`)

- **CustomerBankAccount**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Foreign Key -> `Customer.id`)
  - `bankName`: String
  - `encryptedAccountNumber`: String (Authenticated AES-256-GCM encrypted string)
  - `accountNumberLastFour`: String (Masked display value, e.g., `"4321"`)
  - `branchName`: String (Nullable)
  - `routingNumber`: String (Nullable)
  - `keyVersion`: Integer (Encryption key version)
  - `createdAt`: Timestamp (UTC)

- **CustomerDocument**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Foreign Key -> `Customer.id`)
  - `documentType`: Enum (`UTILITY_BILL`, `AUTHORIZATION_LETTER`, `OTHER`)
  - `filePath`: String (Private object storage path)
  - `description`: String (Nullable)
  - `uploadedAt`: Timestamp (UTC)

- **CustomerAccount** (Future Phase 12 - Optional)
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Unique Foreign Key -> `Customer.id`)
  - `phone`: String (Unique, verified phone number)
  - `passwordHash`: String (Argon2id hash)
  - `isActive`: Boolean (Default: `true`)
  - `createdAt`: Timestamp (UTC)
  - `lastLoginAt`: Timestamp (UTC, Nullable)

---

### 3. Bike Inventory

- **Bike**
  - `id`: UUID (Primary Key)
  - `registrationNumber`: String (Unique)
  - `brand`: String
  - `model`: String
  - `year`: Integer
  - `engineCC`: Integer
  - `color`: String
  - `mileageKm`: Integer
  - `fuelType`: Enum (`PETROL`, `OCTANE`, `ELECTRIC`)
  - `transmissionType`: Enum (`MANUAL`, `AUTOMATIC`, `SEMI_AUTOMATIC`)
  - `conditionGrade`: Enum (`EXCELLENT`, `GOOD`, `FAIR`)
  - `askingPrice`: Decimal (12, 2)
  - `publicStatus`: Enum (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`)
  - `description`: String (Text)
  - `features`: String (Text / Markdown)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *No Circular FK:* `Bike` does NOT store `purchaseId`. Relationship to purchase is authoritative via `Purchase.bikeId`.

- **BikeImage**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`)
  - `imagePath`: String (Public image storage path)
  - `displayOrder`: Integer (Default: `0`)
  - `isPrimary`: Boolean (Default: `false`)
  - `uploadedAt`: Timestamp (UTC)

- **BikeCondition**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Unique Foreign Key -> `Bike.id`)
  - `engineCondition`: String
  - `bodyCondition`: String
  - `tyreCondition`: String
  - `brakeCondition`: String
  - `electricalCondition`: String
  - `overallNotes`: String (Nullable)
  - `inspectedAt`: Timestamp (UTC)
  - `inspectedByAdminId`: UUID (Foreign Key -> `AdminUser.id`)

- **BikeDocument**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`)
  - `documentType`: Enum (`REGISTRATION_CARD`, `TAX_TOKEN`, `FITNESS_CERTIFICATE`, `NAME_TRANSFER_DOC`)
  - `filePath`: String (Private object storage path)
  - `description`: String (Nullable)
  - `uploadedAt`: Timestamp (UTC)

- **BikeStatusHistory**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`)
  - `previousStatus`: Enum (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`)
  - `newStatus`: Enum (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`)
  - `changedByAdminId`: UUID (Foreign Key -> `AdminUser.id`)
  - `reason`: String
  - `changedAt`: Timestamp (UTC)

---

### 4. Purchasing (Shop Buys Bike From Seller)

- **Purchase**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`, Authoritative relationship)
  - `sellerId`: UUID (Foreign Key -> `Customer.id`)
  - `purchaseDate`: Timestamp (UTC)
  - `agreedPrice`: Decimal (12, 2)
  - `sellerPaymentDueDate`: Timestamp (UTC, Nullable)
  - `status`: Enum (`DRAFT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`)
  - `documentStatus`: Enum (`PENDING`, `COLLECTED`, `VERIFIED`)
  - `ownershipTransferStatus`: Enum (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`)
  - `confirmedAt`: Timestamp (UTC, Nullable)
  - `completedAt`: Timestamp (UTC, Nullable)
  - `cancelledAt`: Timestamp (UTC, Nullable)
  - `cancellationReason`: String (Nullable)
  - `notes`: String (Nullable)
  - `createdByAdminId`: UUID (Foreign Key -> `AdminUser.id`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *No Stored Remaining Payable:* Seller payable is computed dynamically server-side.

- **PurchasePayment** (Shop pays money OUT to seller)
  - `id`: UUID (Primary Key)
  - `purchaseId`: UUID (Foreign Key -> `Purchase.id`)
  - `amount`: Decimal (12, 2)
  - `paidAt`: Timestamp (UTC)
  - `paymentMethod`: Enum (`CASH`, `BANK_TRANSFER`, `CHEQUE`, `MOBILE_BANKING`)
  - `referenceNumber`: String (Nullable, transaction/cheque ID)
  - `receiptNumber`: String (Unique generated receipt identifier)
  - `notes`: String (Nullable)
  - `createdByAdminId`: UUID (Foreign Key -> `AdminUser.id`)
  - `isVoided`: Boolean (Default: `false`)
  - `voidedAt`: Timestamp (UTC, Nullable)
  - `voidedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`)
  - `voidReason`: String (Nullable)
  - `createdAt`: Timestamp (UTC)

---

### 5. Sales (Shop Sells Bike To Buyer)

- **Sale**
  - `id`: UUID (Primary Key)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`)
  - `buyerId`: UUID (Foreign Key -> `Customer.id`)
  - `saleDate`: Timestamp (UTC)
  - `listedPrice`: Decimal (12, 2)
  - `discountAmount`: Decimal (12, 2) (Default: `0.00`)
  - `finalPrice`: Decimal (12, 2) (Calculated server-side: `listedPrice - discountAmount`)
  - `dueDate`: Timestamp (UTC, Nullable)
  - `paymentTerms`: String (Nullable)
  - `status`: Enum (`DRAFT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`)
  - `documentStatus`: Enum (`PENDING`, `PREPARED`, `DELIVERED`)
  - `ownershipTransferStatus`: Enum (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`)
  - `confirmedAt`: Timestamp (UTC, Nullable)
  - `completedAt`: Timestamp (UTC, Nullable)
  - `cancelledAt`: Timestamp (UTC, Nullable)
  - `cancellationReason`: String (Nullable)
  - `notes`: String (Nullable)
  - `createdByAdminId`: UUID (Foreign Key -> `AdminUser.id`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)
  - *No Stored Remaining Due:* Buyer due is computed dynamically server-side.

- **SalePayment** (Shop receives money IN from buyer)
  - `id`: UUID (Primary Key)
  - `saleId`: UUID (Foreign Key -> `Sale.id`)
  - `amount`: Decimal (12, 2)
  - `receivedAt`: Timestamp (UTC)
  - `paymentMethod`: Enum (`CASH`, `BANK_TRANSFER`, `CHEQUE`, `MOBILE_BANKING`)
  - `referenceNumber`: String (Nullable, transaction/cheque ID)
  - `receiptNumber`: String (Unique generated receipt identifier)
  - `notes`: String (Nullable)
  - `receivedByAdminId`: UUID (Foreign Key -> `AdminUser.id`)
  - `isVoided`: Boolean (Default: `false`)
  - `voidedAt`: Timestamp (UTC, Nullable)
  - `voidedByAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`)
  - `voidReason`: String (Nullable)
  - `createdAt`: Timestamp (UTC)

---

### 6. Operations, Offers & Requests

- **Expense**
  - `id`: UUID (Primary Key)
  - `category`: Enum (`RENT`, `UTILITIES`, `SALARY`, `MAINTENANCE`, `MARKETING`, `OFFICE`, `OTHER`)
  - `description`: String
  - `amount`: Decimal (12, 2)
  - `expenseDate`: Timestamp (UTC)
  - `paidTo`: String (Nullable)
  - `receiptPath`: String (Nullable, private storage)
  - `recordedByAdminId`: UUID (Foreign Key -> `AdminUser.id`)
  - `createdAt`: Timestamp (UTC)

- **Offer**
  - `id`: UUID (Primary Key)
  - `title`: String
  - `description`: String
  - `discountType`: Enum (`PERCENTAGE`, `FIXED_AMOUNT`)
  - `discountValue`: Decimal (12, 2)
  - `startDate`: Timestamp (UTC)
  - `endDate`: Timestamp (UTC)
  - `isActive`: Boolean (Default: `true`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **OfferBike** (Relational join entity replacing array-based IDs)
  - `id`: UUID (Primary Key)
  - `offerId`: UUID (Foreign Key -> `Offer.id`)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`)
  - `createdAt`: Timestamp (UTC)
  - *Constraint:* Unique pair `(offerId, bikeId)`

- **BikeRequest**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Nullable Foreign Key -> `Customer.id`)
  - `requesterName`: String
  - `requesterPhone`: String (Normalized)
  - `preferredBrand`: String
  - `preferredModel`: String
  - `preferredYearMin`: Integer (Nullable)
  - `preferredYearMax`: Integer (Nullable)
  - `minimumBudget`: Decimal (12, 2) (Nullable)
  - `maximumBudget`: Decimal (12, 2) (Nullable)
  - `maximumMileageKm`: Integer (Nullable)
  - `preferredColor`: String (Nullable)
  - `requiredBy`: Timestamp (UTC, Nullable)
  - `paymentPreference`: String (Nullable)
  - `notes`: String (Nullable)
  - `requestStatus`: Enum (`NEW`, `REVIEWED`, `MATCHED`, `CLOSED`)
  - `contactStatus`: Enum (`NOT_CONTACTED`, `CONTACTED`, `UNREACHABLE`)
  - `assignedAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **SellBikeRequest**
  - `id`: UUID (Primary Key)
  - `customerId`: UUID (Nullable Foreign Key -> `Customer.id`)
  - `sellerName`: String
  - `sellerPhone`: String (Normalized)
  - `bikeBrand`: String
  - `bikeModel`: String
  - `bikeYear`: Integer
  - `askingPrice`: Decimal (12, 2)
  - `description`: String (Nullable)
  - `status`: Enum (`NEW`, `REVIEWED`, `CONTACTED`, `PURCHASED`, `REJECTED`)
  - `assignedAdminId`: UUID (Nullable Foreign Key -> `AdminUser.id`)
  - `createdAt`: Timestamp (UTC)
  - `updatedAt`: Timestamp (UTC)

- **SellBikeRequestImage** (Relational entity replacing array-based image paths)
  - `id`: UUID (Primary Key)
  - `sellBikeRequestId`: UUID (Foreign Key -> `SellBikeRequest.id`)
  - `imagePath`: String (Public or staging storage path)
  - `displayOrder`: Integer (Default: `0`)
  - `createdAt`: Timestamp (UTC)

- **Inquiry**
  - `id`: UUID (Primary Key)
  - `name`: String
  - `phone`: String (Normalized)
  - `email`: String (Nullable)
  - `message`: String
  - `bikeId`: UUID (Nullable Foreign Key -> `Bike.id`)
  - `inquiryType`: Enum (`GENERAL`, `BIKE_SPECIFIC`, `INSPECTION`)
  - `status`: Enum (`NEW`, `IN_PROGRESS`, `RESOLVED`, `SPAM`)
  - `createdAt`: Timestamp (UTC)

- **InspectionBooking**
  - `id`: UUID (Primary Key)
  - `name`: String
  - `phone`: String (Normalized)
  - `bikeId`: UUID (Foreign Key -> `Bike.id`)
  - `preferredDate`: Timestamp (UTC)
  - `status`: Enum (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`)
  - `notes`: String (Nullable)
  - `createdAt`: Timestamp (UTC)

- **ShopSetting**
  - `id`: UUID (Primary Key)
  - `key`: String (Unique)
  - `value`: String
  - `updatedAt`: Timestamp (UTC)

---

## Core Database Design Rules

### 1. Financial Settlement & Arithmetic
- **Buyer Outstanding Due:** Computed dynamically server-side:
  $$\text{Buyer Due} = \text{Sale.finalPrice} - \sum (\text{Valid SalePayment.amount WHERE isVoided = false})$$
- **Seller Outstanding Payable:** Computed dynamically server-side:
  $$\text{Seller Payable} = \text{Purchase.agreedPrice} - \sum (\text{Valid PurchasePayment.amount WHERE isVoided = false})$$
- **No Stored Balances:** `remainingDue` and `remainingPayable` must NOT be stored as editable database columns to prevent balance drift.
- **No Floating-Point Money:** All financial calculations are executed using PostgreSQL `DECIMAL(12, 2)` or server-side arbitrary-precision libraries (e.g., `decimal.js`). Floating-point arithmetic (`number` in JS) is strictly prohibited for monetary calculations.

### 2. Payment Auditing & Immutability
- Posted `PurchasePayment` and `SalePayment` records are append-only ledgers. They must **never** be silently deleted or updated.
- Corrections require an explicit void operation: setting `isVoided = true`, recording `voidedAt`, `voidedByAdminId`, and `voidReason`.

### 3. Public Status vs. Financial Status
- `Bike.publicStatus` (`DRAFT`, `AVAILABLE`, `RESERVED`, `SOLD`, `HIDDEN`) dictates public catalogue visibility.
- A bike may be publicly marked `SOLD` as soon as a `Sale` agreement is confirmed, even while buyer payments remain pending.

### 4. NID Verification Lifecycle
- NID status transitions: `PENDING` -> `SUBMITTED` -> `VERIFIED` (or `NEEDS_CORRECTION`).
- `PENDING` is permitted during customer creation, public enquiries, bike requests, reservations, draft purchases/sales, and initial deposit payments.
- Final transaction document completion requires minimum `SUBMITTED`.
- Ownership transfer completion requires `VERIFIED`.

### 5. Controlled Phone Handling
- Customer phone numbers are normalized (Bangladesh format `+8801...`).
- Phone numbers are **not** strictly unique globally, allowing family members to share a phone number. The system flags potential matches for admin review rather than failing opaquely.

---

## Planned Indexes & Constraints

1. **Administration & Auth:**
   - `AdminUser`: Unique index on `email`.
   - `AdminSession`: Unique index on `sessionTokenHash`.
2. **Customers & Identity:**
   - `CustomerRole`: Unique composite constraint `(customerId, role)`.
   - `CustomerAccount`: Unique constraint on `customerId`.
   - `CustomerIdentity`: Unique index on `customerId`; index on `nidNumberHmac` for duplicate identification.
3. **Inventory & Relational Data:**
   - `Bike`: Unique index on `registrationNumber`; index on `publicStatus`.
   - `OfferBike`: Unique composite constraint `(offerId, bikeId)`.
   - `SellBikeRequestImage`: Index on `sellBikeRequestId`.
4. **Transactions & Financial Ledger:**
   - `Purchase`: Index on `sellerId`; index on `bikeId`.
   - `Sale`: Index on `buyerId`; index on `bikeId`.
   - `PurchasePayment`: Index on `purchaseId`; unique index on `receiptNumber`.
   - `SalePayment`: Index on `saleId`; unique index on `receiptNumber`.
5. **Operations & Audit:**
   - `BikeRequest`: Index on `requestStatus`; index on `requiredBy`.
   - `AuditLog`: Composite index on `(entityType, entityId)`.
