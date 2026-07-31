# Database Design Document

## Overview
This document outlines the database design for the "Bike Management System" (customer-facing name: "Sristy-Dristy Bike House", legal name: "Sristy-Dristy Enterprise"). The database is PostgreSQL, accessed through the Prisma ORM. 

**Core Conventions:**
- All monetary values are strictly represented using the `Decimal` type to ensure precision.
- All timestamps are recorded in coordinated universal time (UTC).
- This is a DESIGN DOCUMENT only. The corresponding Prisma models are derived from these specifications.

---

## Planned Entities

### Administration
- **AdminUser**: 
  - `id`, `email`, `passwordHash`, `name`, `role`, `isActive`, `createdAt`, `updatedAt`
- **AdminSession**: 
  - `id`, `adminUserId`, `sessionToken`, `expiresAt`, `createdAt`, `ipAddress`, `userAgent`
- **AuditLog**: 
  - `id`, `adminUserId`, `action`, `entityType`, `entityId`, `previousValue` (JSON), `newValue` (JSON), `ipAddress`, `createdAt`

### Customers
- **Customer**: 
  - `id`, `fullName`, `phone` (normalized), `whatsappNumber`, `email`, `fatherName`, `address`, `emergencyContact`, `internalNotes`, `nidStatus` (PENDING/SUBMITTED/VERIFIED/REJECTED), `createdAt`, `updatedAt`
- **CustomerRole**: 
  - `id`, `customerId`, `role` (BUYER/SELLER/POTENTIAL_BUYER/POTENTIAL_SELLER/BIKE_REQUESTER), `assignedAt`
- **CustomerIdentity**: 
  - `id`, `customerId`, `nidNumber` (encrypted), `nidNumberHash` (for duplicate detection), `frontImagePath`, `backImagePath`, `verifiedAt`, `verifiedBy`
- **CustomerBankAccount**: 
  - `id`, `customerId`, `bankName`, `accountNumber` (encrypted), `accountNumberMasked`, `branchName`, `createdAt`
- **CustomerDocument**: 
  - `id`, `customerId`, `documentType`, `filePath` (private storage), `uploadedAt`, `description`
- **CustomerAccount** (future): 
  - `id`, `customerId` (unique one-to-one), `phone` (verified), `passwordHash`, `isActive`, `createdAt`, `lastLoginAt`

### Bike Inventory
- **Bike**: 
  - `id`, `registrationNumber`, `brand`, `model`, `year`, `engineCC`, `color`, `mileageKm`, `fuelType`, `transmissionType`, `condition`, `askingPrice` (Decimal), `purchaseId` (nullable FK), `publicStatus` (AVAILABLE/RESERVED/SOLD/UNLISTED), `description`, `features`, `createdAt`, `updatedAt`
- **BikeImage**: 
  - `id`, `bikeId`, `imagePath`, `displayOrder`, `isPrimary`, `uploadedAt`
- **BikeCondition**: 
  - `id`, `bikeId`, `engineCondition`, `bodyCondition`, `tyreCondition`, `brakeCondition`, `electricalCondition`, `overallNotes`, `inspectedAt`, `inspectedBy`
- **BikeDocument**: 
  - `id`, `bikeId`, `documentType`, `filePath`, `description`, `uploadedAt`
- **BikeStatusHistory**: 
  - `id`, `bikeId`, `previousStatus`, `newStatus`, `changedBy`, `changedAt`, `reason`

### Purchasing (Shop buys from sellers)
- **Purchase**: 
  - `id`, `bikeId`, `sellerId` (Customer FK), `purchaseDate`, `agreedPrice` (Decimal), `status` (DRAFT/CONFIRMED/COMPLETED/CANCELLED), `notes`, `createdAt`, `updatedAt`
  - *Note: `totalPaid` is computed server-side and not stored.*
- **PurchasePayment**: 
  - `id`, `purchaseId`, `amount` (Decimal), `paymentDate`, `paymentMethod`, `receivedBy`, `receiptNumber`, `notes`, `isVoided`, `voidReason`, `voidedAt`, `voidedBy`, `createdAt`

### Sales (Shop sells to buyers)
- **Sale**: 
  - `id`, `bikeId`, `buyerId` (Customer FK), `saleDate`, `agreedPrice` (Decimal), `discount` (Decimal), `finalPrice` (Decimal), `status` (DRAFT/CONFIRMED/COMPLETED/CANCELLED), `notes`, `createdAt`, `updatedAt`
- **SalePayment**: 
  - `id`, `saleId`, `amount` (Decimal), `paymentDate`, `paymentMethod`, `receivedBy`, `receiptNumber`, `notes`, `isVoided`, `voidReason`, `voidedAt`, `voidedBy`, `createdAt`

### Operations
- **Expense**: 
  - `id`, `category`, `description`, `amount` (Decimal), `expenseDate`, `paidTo`, `receiptPath`, `recordedBy`, `createdAt`
- **Offer**: 
  - `id`, `title`, `description`, `discountType`, `discountValue`, `applicableBikeIds`, `startDate`, `endDate`, `isActive`, `createdAt`, `updatedAt`
- **BikeRequest**: 
  - `id`, `requesterName`, `requesterPhone`, `preferredBrand`, `preferredModel`, `budgetRange`, `description`, `status` (NEW/REVIEWED/MATCHED/CLOSED), `customerId` (nullable FK for linked customer), `createdAt`, `updatedAt`
- **SellBikeRequest**: 
  - `id`, `sellerName`, `sellerPhone`, `bikeBrand`, `bikeModel`, `bikeYear`, `askingPrice`, `description`, `imagePaths`, `status` (NEW/REVIEWED/CONTACTED/PURCHASED/REJECTED), `customerId` (nullable FK), `createdAt`, `updatedAt`
- **Inquiry**: 
  - `id`, `name`, `phone`, `email`, `message`, `bikeId` (nullable), `type`, `status`, `createdAt`
- **InspectionBooking**: 
  - `id`, `name`, `phone`, `bikeId`, `preferredDate`, `status`, `notes`, `createdAt`
- **ShopSetting**: 
  - `id`, `key` (unique), `value`, `updatedAt`

---

## Design Rules

To maintain data integrity and consistency, the following rules apply across the entire data model:

1. **Role Flexibility:** A customer may hold multiple roles simultaneously.
2. **Phone Normalization:** Customer phone numbers require normalization (standardized Bangladesh format).
3. **Duplicate Phones:** Duplicate phone numbers require controlled handling (system must warn the administrator, not silently create the duplicate or fail opaquely).
4. **NID Lifecycle:** A customer's NID may start as `PENDING` — transactions can begin but must not be finalized until verification is complete.
5. **NID Security:** Sensitive NID values must use encrypted storage at rest.
6. **Duplicate NID Detection:** A separate secure lookup hash must be used for duplicate-NID detection without exposing or decrypting the raw NID.
7. **Account Masking:** Bank account numbers must be masked in normal admin displays (showing only the last 4 digits).
8. **Document Storage:** Customer documents must use private object storage, not publicly accessible URLs.
9. **Separate Domains:** Purchases (shop buys) and sales (shop sells) are separate transaction domains with distinct, isolated payment tables.
10. **Auditable Payments:** Each payment is an independent auditable record — records must never be silently deleted.
11. **Decimal Precision:** All monetary values strictly use Decimal-compatible database types (PostgreSQL `DECIMAL`/`NUMERIC`).
12. **Status Separation:** Public bike status (`AVAILABLE`, `SOLD`) and financial settlement status are distinct concepts.
13. **Asynchronous Settlement:** A bike may be publicly marked `SOLD` while buyer payments are still pending or due.
14. **Computed Values:** Financial totals and remaining balances are calculated server-side. They are not stored as denormalized fields unless an explicit, documented consistency strategy is implemented.
15. **Database Transactions:** Multi-record workflow modifications (e.g., completing a sale + updating bike status + recording payment) require strict database transactions to guarantee atomicity.
16. **No Deletions of Payments:** Posted payments cannot be silently deleted — use void/reversal records (`isVoided`, `voidReason`) instead.
17. **Schema Review:** All schema migrations must undergo formal review before being applied to the production database.
18. **Data Integrity:** Foreign-key and uniqueness constraints must be utilized heavily where data integrity requires it.
19. **No Duplicated Balances:** Do not duplicate computed balances across unrelated tables without a strict, documented consistency strategy.
20. **Timezones:** All timestamps are strictly maintained in UTC.
21. **Data Retention:** Soft delete should be considered and implemented for financial records (via status transitions, voiding, and active flags rather than record removal).

---

## Index Strategy

To ensure optimal query performance, the following indexes are planned:

- **Phone Number Lookups:** 
  - `Customer(phone)` - Standard search and duplicate prevention.
  - `Customer(whatsappNumber)` - For rapid messaging lookups.
- **Identity Deduplication:** 
  - `CustomerIdentity(nidNumberHash)` - Essential for identifying duplicate NID submissions without decrypting values.
- **Bike Inventory Search:** 
  - `Bike(publicStatus)` - Fast filtering of available bikes for the public storefront.
  - `Bike(brand, model)` - Text search and filtering optimizations.
  - `Bike(registrationNumber)` - For internal and administrative lookup.
- **Financial Queries:** 
  - `Purchase(sellerId)` - Fast lookup of purchases associated with a specific customer.
  - `Sale(buyerId)` - Fast lookup of sales associated with a specific customer.
  - `PurchasePayment(purchaseId)` and `SalePayment(saleId)` - Needed for rapidly calculating totals server-side.
- **Administration & Security:** 
  - `AdminSession(sessionToken)` - Required for immediate session validation.
  - `AdminUser(email)` - Login lookup.
  - `AuditLog(entityType, entityId)` - Allows quick reconstruction of the history of any specific record.
- **Operations:** 
  - `ShopSetting(key)` - Unique lookup for application configuration.
  - `Offer(applicableBikeIds)` - GIN index for efficiently matching active offers to specific bikes.
