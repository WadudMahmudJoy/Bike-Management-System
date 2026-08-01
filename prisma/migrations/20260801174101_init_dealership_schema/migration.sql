-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CustomerRoleType" AS ENUM ('BUYER', 'SELLER', 'POTENTIAL_BUYER', 'POTENTIAL_SELLER', 'BIKE_REQUESTER');

-- CreateEnum
CREATE TYPE "CustomerAccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "NidStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'NEEDS_CORRECTION');

-- CreateEnum
CREATE TYPE "CustomerDocumentType" AS ENUM ('NID_FRONT', 'NID_BACK', 'BANK_DOCUMENT', 'SALE_AGREEMENT', 'PURCHASE_AGREEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "BikeStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'HIDDEN');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'ELECTRIC', 'HYBRID', 'OTHER');

-- CreateEnum
CREATE TYPE "BikeConditionComponent" AS ENUM ('ENGINE', 'BODY', 'TYRES', 'BATTERY', 'ELECTRICAL', 'BRAKES', 'SUSPENSION', 'TRANSMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "ConditionRating" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_ATTENTION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BikeDocumentType" AS ENUM ('REGISTRATION', 'TAX_TOKEN', 'FITNESS', 'OWNERSHIP_TRANSFER', 'PURCHASE_RECEIPT', 'SERVICE_HISTORY', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'NEEDS_CORRECTION', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "OwnershipTransferStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'RESERVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET', 'CHEQUE', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "BikeRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'SEARCHING', 'MATCH_FOUND', 'CUSTOMER_NOTIFIED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NOT_CONTACTED', 'CONTACTED', 'FOLLOW_UP_REQUIRED', 'UNREACHABLE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SellBikeRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'CONTACTED', 'INSPECTION_SCHEDULED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'INSPECTION_BOOKED', 'NEGOTIATING', 'COMPLETED', 'NOT_INTERESTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InquirySource" AS ENUM ('WEBSITE', 'WHATSAPP', 'PHONE', 'FACEBOOK', 'WALK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PreferredContactMethod" AS ENUM ('PHONE', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "PaymentPreference" AS ENUM ('CASH', 'INSTALLMENT', 'DUE', 'NEGOTIABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('REPAIR', 'TRANSPORT', 'DOCUMENT_TRANSFER', 'MARKETING', 'UTILITIES', 'RENT', 'SALARY', 'OTHER');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" UUID NOT NULL,
    "adminUserId" UUID NOT NULL,
    "sessionTokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "adminUserId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(255) NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" VARCHAR(45),
    "requestCorrelationId" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "customerCode" VARCHAR(50),
    "fullName" VARCHAR(255) NOT NULL,
    "fatherName" VARCHAR(255),
    "phone" VARCHAR(50) NOT NULL,
    "phoneNormalized" VARCHAR(50) NOT NULL,
    "whatsappNumber" VARCHAR(50),
    "whatsappNormalized" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "emergencyContact" VARCHAR(255),
    "internalNotes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdByAdminId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRole" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "role" "CustomerRoleType" NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerIdentity" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "nidStatus" "NidStatus" NOT NULL DEFAULT 'PENDING',
    "encryptedNidNumber" TEXT,
    "encryptionIv" VARCHAR(255),
    "authTag" VARCHAR(255),
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "nidNumberHmac" VARCHAR(255),
    "lastFour" VARCHAR(4),
    "submittedAt" TIMESTAMPTZ(3),
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedByAdminId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerBankAccount" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "bankName" VARCHAR(255) NOT NULL,
    "accountHolderName" VARCHAR(255) NOT NULL,
    "branchName" VARCHAR(255),
    "encryptedAccountNumber" TEXT,
    "encryptionIv" VARCHAR(255),
    "authTag" VARCHAR(255),
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "accountNumberLastFour" VARCHAR(4),
    "routingNumber" VARCHAR(100),
    "mobileBankingProvider" VARCHAR(100),
    "mobileBankingNumber" VARCHAR(50),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDocument" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "documentType" "CustomerDocumentType" NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "originalFileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedByAdminId" UUID,

    CONSTRAINT "CustomerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "phoneNormalized" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "passwordHash" TEXT,
    "phoneVerifiedAt" TIMESTAMPTZ(3),
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "status" "CustomerAccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bike" (
    "id" UUID NOT NULL,
    "stockCode" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "variant" VARCHAR(100),
    "modelYear" INTEGER NOT NULL,
    "registrationYear" INTEGER,
    "engineCapacityCc" INTEGER NOT NULL,
    "mileageKm" INTEGER NOT NULL,
    "color" VARCHAR(100) NOT NULL,
    "fuelType" "FuelType" NOT NULL DEFAULT 'PETROL',
    "registrationNumber" VARCHAR(100),
    "ownershipCount" INTEGER,
    "askingPrice" DECIMAL(14,2),
    "isNegotiable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "knownIssues" TEXT,
    "inspectionNotes" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "BikeStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Bike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeImage" (
    "id" UUID NOT NULL,
    "bikeId" UUID NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "publicUrl" VARCHAR(1024),
    "altText" VARCHAR(255),
    "width" INTEGER,
    "height" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BikeImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeCondition" (
    "id" UUID NOT NULL,
    "bikeId" UUID NOT NULL,
    "component" "BikeConditionComponent" NOT NULL,
    "rating" "ConditionRating" NOT NULL,
    "notes" TEXT,
    "inspectedByAdminId" UUID,
    "inspectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BikeCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeDocument" (
    "id" UUID NOT NULL,
    "bikeId" UUID NOT NULL,
    "documentType" "BikeDocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "privateStorageKey" VARCHAR(512),
    "expiryDate" TIMESTAMPTZ(3),
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedByAdminId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BikeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeStatusHistory" (
    "id" UUID NOT NULL,
    "bikeId" UUID NOT NULL,
    "previousStatus" "BikeStatus" NOT NULL,
    "newStatus" "BikeStatus" NOT NULL,
    "changedByAdminId" UUID,
    "reason" TEXT NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BikeStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL,
    "purchaseNumber" VARCHAR(50) NOT NULL,
    "bikeId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "purchaseDate" TIMESTAMPTZ(3) NOT NULL,
    "agreedPrice" DECIMAL(14,2) NOT NULL,
    "sellerPaymentDueDate" TIMESTAMPTZ(3),
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "documentStatus" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "ownershipTransferStatus" "OwnershipTransferStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "confirmedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" TEXT,
    "notes" TEXT,
    "createdByAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "id" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMPTZ(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" VARCHAR(100),
    "receiptNumber" VARCHAR(100) NOT NULL,
    "notes" TEXT,
    "createdByAdminId" UUID NOT NULL,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMPTZ(3),
    "voidedByAdminId" UUID,
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "saleNumber" VARCHAR(50) NOT NULL,
    "bikeId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "saleDate" TIMESTAMPTZ(3) NOT NULL,
    "listedPrice" DECIMAL(14,2) NOT NULL,
    "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "finalPrice" DECIMAL(14,2) NOT NULL,
    "dueDate" TIMESTAMPTZ(3),
    "paymentTerms" TEXT,
    "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
    "documentStatus" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "ownershipTransferStatus" "OwnershipTransferStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "confirmedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" TEXT,
    "notes" TEXT,
    "createdByAdminId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" VARCHAR(100),
    "receiptNumber" VARCHAR(100) NOT NULL,
    "notes" TEXT,
    "receivedByAdminId" UUID NOT NULL,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMPTZ(3),
    "voidedByAdminId" UUID,
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "expenseNumber" VARCHAR(50) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "incurredDate" TIMESTAMPTZ(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" VARCHAR(100),
    "description" TEXT NOT NULL,
    "paidTo" VARCHAR(255),
    "receiptPath" VARCHAR(512),
    "bikeId" UUID,
    "purchaseId" UUID,
    "saleId" UUID,
    "recordedByAdminId" UUID NOT NULL,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMPTZ(3),
    "voidedByAdminId" UUID,
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "offerType" "OfferType" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "endDate" TIMESTAMPTZ(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeaturedOnHome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferBike" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "bikeId" UUID NOT NULL,
    "customOfferPrice" DECIMAL(14,2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferBike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeRequest" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "requesterName" VARCHAR(255) NOT NULL,
    "requesterPhoneNormalized" VARCHAR(50) NOT NULL,
    "preferredBrand" VARCHAR(100) NOT NULL,
    "preferredModel" VARCHAR(100) NOT NULL,
    "minimumYear" INTEGER,
    "maximumYear" INTEGER,
    "minimumBudget" DECIMAL(14,2),
    "maximumBudget" DECIMAL(14,2),
    "maximumMileageKm" INTEGER,
    "preferredColor" VARCHAR(100),
    "requiredBy" TIMESTAMPTZ(3),
    "paymentPreference" "PaymentPreference",
    "notes" TEXT,
    "requestStatus" "BikeRequestStatus" NOT NULL DEFAULT 'NEW',
    "contactStatus" "ContactStatus" NOT NULL DEFAULT 'NOT_CONTACTED',
    "assignedAdminId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BikeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellBikeRequest" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "sellerName" VARCHAR(255) NOT NULL,
    "sellerPhoneNormalized" VARCHAR(50) NOT NULL,
    "preferredContactMethod" "PreferredContactMethod" NOT NULL DEFAULT 'PHONE',
    "brand" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "variant" VARCHAR(100),
    "modelYear" INTEGER,
    "registrationYear" INTEGER,
    "mileageKm" INTEGER,
    "expectedPrice" DECIMAL(14,2),
    "location" VARCHAR(255) NOT NULL,
    "documentNotes" TEXT,
    "knownProblems" TEXT,
    "status" "SellBikeRequestStatus" NOT NULL DEFAULT 'NEW',
    "assignedAdminId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SellBikeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellBikeRequestImage" (
    "id" UUID NOT NULL,
    "sellBikeRequestId" UUID NOT NULL,
    "storageKey" VARCHAR(512) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellBikeRequestImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "bikeId" UUID,
    "requesterName" VARCHAR(255) NOT NULL,
    "phoneNormalized" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "source" "InquirySource" NOT NULL DEFAULT 'WEBSITE',
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "assignedAdminId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionBooking" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "bikeId" UUID,
    "requesterName" VARCHAR(255) NOT NULL,
    "phoneNormalized" VARCHAR(50) NOT NULL,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3),
    "status" "InspectionStatus" NOT NULL DEFAULT 'REQUESTED',
    "assignedAdminId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InspectionBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSetting" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ShopSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_sessionTokenHash_key" ON "AdminSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_adminUserId_idx" ON "AdminSession"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_adminUserId_idx" ON "AuditLog"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");

-- CreateIndex
CREATE INDEX "Customer_phoneNormalized_idx" ON "Customer"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_createdByAdminId_idx" ON "Customer"("createdByAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRole_customerId_role_key" ON "CustomerRole"("customerId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerIdentity_customerId_key" ON "CustomerIdentity"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerIdentity_nidNumberHmac_key" ON "CustomerIdentity"("nidNumberHmac");

-- CreateIndex
CREATE INDEX "CustomerBankAccount_customerId_idx" ON "CustomerBankAccount"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_customerId_key" ON "CustomerAccount"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_phoneNormalized_key" ON "CustomerAccount"("phoneNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_email_key" ON "CustomerAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Bike_stockCode_key" ON "Bike"("stockCode");

-- CreateIndex
CREATE UNIQUE INDEX "Bike_slug_key" ON "Bike"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Bike_registrationNumber_key" ON "Bike"("registrationNumber");

-- CreateIndex
CREATE INDEX "Bike_status_idx" ON "Bike"("status");

-- CreateIndex
CREATE INDEX "Bike_brand_model_idx" ON "Bike"("brand", "model");

-- CreateIndex
CREATE INDEX "Bike_modelYear_idx" ON "Bike"("modelYear");

-- CreateIndex
CREATE INDEX "Bike_askingPrice_idx" ON "Bike"("askingPrice");

-- CreateIndex
CREATE INDEX "Bike_createdAt_idx" ON "Bike"("createdAt");

-- CreateIndex
CREATE INDEX "BikeImage_bikeId_displayOrder_idx" ON "BikeImage"("bikeId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BikeCondition_bikeId_component_key" ON "BikeCondition"("bikeId", "component");

-- CreateIndex
CREATE INDEX "BikeStatusHistory_bikeId_idx" ON "BikeStatusHistory"("bikeId");

-- CreateIndex
CREATE INDEX "BikeStatusHistory_changedAt_idx" ON "BikeStatusHistory"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_purchaseNumber_key" ON "Purchase"("purchaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_bikeId_key" ON "Purchase"("bikeId");

-- CreateIndex
CREATE INDEX "Purchase_sellerId_idx" ON "Purchase"("sellerId");

-- CreateIndex
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePayment_receiptNumber_key" ON "PurchasePayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "PurchasePayment_purchaseId_idx" ON "PurchasePayment"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchasePayment_paidAt_idx" ON "PurchasePayment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_saleNumber_key" ON "Sale"("saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_bikeId_key" ON "Sale"("bikeId");

-- CreateIndex
CREATE INDEX "Sale_buyerId_idx" ON "Sale"("buyerId");

-- CreateIndex
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_dueDate_idx" ON "Sale"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalePayment_receiptNumber_key" ON "SalePayment"("receiptNumber");

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");

-- CreateIndex
CREATE INDEX "SalePayment_receivedAt_idx" ON "SalePayment"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_expenseNumber_key" ON "Expense"("expenseNumber");

-- CreateIndex
CREATE INDEX "Expense_incurredDate_idx" ON "Expense"("incurredDate");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Offer_isActive_startDate_endDate_idx" ON "Offer"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "OfferBike_offerId_bikeId_key" ON "OfferBike"("offerId", "bikeId");

-- CreateIndex
CREATE INDEX "BikeRequest_requesterPhoneNormalized_idx" ON "BikeRequest"("requesterPhoneNormalized");

-- CreateIndex
CREATE INDEX "BikeRequest_requestStatus_idx" ON "BikeRequest"("requestStatus");

-- CreateIndex
CREATE INDEX "BikeRequest_requiredBy_idx" ON "BikeRequest"("requiredBy");

-- CreateIndex
CREATE INDEX "SellBikeRequest_sellerPhoneNormalized_idx" ON "SellBikeRequest"("sellerPhoneNormalized");

-- CreateIndex
CREATE INDEX "SellBikeRequest_status_idx" ON "SellBikeRequest"("status");

-- CreateIndex
CREATE INDEX "SellBikeRequestImage_sellBikeRequestId_idx" ON "SellBikeRequestImage"("sellBikeRequestId");

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- CreateIndex
CREATE INDEX "InspectionBooking_requestedAt_idx" ON "InspectionBooking"("requestedAt");

-- CreateIndex
CREATE INDEX "InspectionBooking_status_idx" ON "InspectionBooking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSetting_key_key" ON "ShopSetting"("key");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRole" ADD CONSTRAINT "CustomerRole_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "CustomerIdentity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "CustomerIdentity_verifiedByAdminId_fkey" FOREIGN KEY ("verifiedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "CustomerBankAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_verifiedByAdminId_fkey" FOREIGN KEY ("verifiedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAccount" ADD CONSTRAINT "CustomerAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeImage" ADD CONSTRAINT "BikeImage_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeCondition" ADD CONSTRAINT "BikeCondition_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeCondition" ADD CONSTRAINT "BikeCondition_inspectedByAdminId_fkey" FOREIGN KEY ("inspectedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeDocument" ADD CONSTRAINT "BikeDocument_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeDocument" ADD CONSTRAINT "BikeDocument_verifiedByAdminId_fkey" FOREIGN KEY ("verifiedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeStatusHistory" ADD CONSTRAINT "BikeStatusHistory_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeStatusHistory" ADD CONSTRAINT "BikeStatusHistory_changedByAdminId_fkey" FOREIGN KEY ("changedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_voidedByAdminId_fkey" FOREIGN KEY ("voidedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_receivedByAdminId_fkey" FOREIGN KEY ("receivedByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_voidedByAdminId_fkey" FOREIGN KEY ("voidedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedByAdminId_fkey" FOREIGN KEY ("recordedByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferBike" ADD CONSTRAINT "OfferBike_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferBike" ADD CONSTRAINT "OfferBike_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeRequest" ADD CONSTRAINT "BikeRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeRequest" ADD CONSTRAINT "BikeRequest_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellBikeRequest" ADD CONSTRAINT "SellBikeRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellBikeRequest" ADD CONSTRAINT "SellBikeRequest_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellBikeRequestImage" ADD CONSTRAINT "SellBikeRequestImage_sellBikeRequestId_fkey" FOREIGN KEY ("sellBikeRequestId") REFERENCES "SellBikeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionBooking" ADD CONSTRAINT "InspectionBooking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionBooking" ADD CONSTRAINT "InspectionBooking_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionBooking" ADD CONSTRAINT "InspectionBooking_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- CUSTOM POSTGRESQL CHECK CONSTRAINTS
-- -----------------------------------------------------------------------------

-- Purchase & PurchasePayment Constraints
ALTER TABLE "Purchase" ADD CONSTRAINT "chk_purchase_agreed_price_positive" CHECK ("agreedPrice" > 0);
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "chk_purchase_payment_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "chk_purchase_payment_void_consistency" CHECK (
  ("isVoided" = false AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR
  ("isVoided" = true AND "voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND trim("voidReason") != '')
);

-- Sale & SalePayment Constraints
ALTER TABLE "Sale" ADD CONSTRAINT "chk_sale_listed_price_nonnegative" CHECK ("listedPrice" >= 0);
ALTER TABLE "Sale" ADD CONSTRAINT "chk_sale_discount_nonnegative" CHECK ("discountAmount" >= 0);
ALTER TABLE "Sale" ADD CONSTRAINT "chk_sale_final_price_nonnegative" CHECK ("finalPrice" >= 0);
ALTER TABLE "Sale" ADD CONSTRAINT "chk_sale_final_price_max_listed" CHECK ("finalPrice" <= "listedPrice");
ALTER TABLE "SalePayment" ADD CONSTRAINT "chk_sale_payment_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "SalePayment" ADD CONSTRAINT "chk_sale_payment_void_consistency" CHECK (
  ("isVoided" = false AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR
  ("isVoided" = true AND "voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND trim("voidReason") != '')
);

-- Expense Constraints
ALTER TABLE "Expense" ADD CONSTRAINT "chk_expense_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "chk_expense_void_consistency" CHECK (
  ("isVoided" = false AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR
  ("isVoided" = true AND "voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND trim("voidReason") != '')
);

-- Bike Numeric & Year Constraints
ALTER TABLE "Bike" ADD CONSTRAINT "chk_bike_asking_price_positive" CHECK ("askingPrice" IS NULL OR "askingPrice" > 0);
ALTER TABLE "Bike" ADD CONSTRAINT "chk_bike_engine_capacity_positive" CHECK ("engineCapacityCc" > 0);
ALTER TABLE "Bike" ADD CONSTRAINT "chk_bike_mileage_nonnegative" CHECK ("mileageKm" >= 0);
ALTER TABLE "Bike" ADD CONSTRAINT "chk_bike_model_year_range" CHECK ("modelYear" BETWEEN 1900 AND 2100);
ALTER TABLE "Bike" ADD CONSTRAINT "chk_bike_registration_year_range" CHECK ("registrationYear" IS NULL OR ("registrationYear" BETWEEN 1900 AND 2100));

-- BikeRequest Budget & Year Constraints
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_year_range" CHECK ("minimumYear" IS NULL OR "maximumYear" IS NULL OR "minimumYear" <= "maximumYear");
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_min_budget_nonnegative" CHECK ("minimumBudget" IS NULL OR "minimumBudget" >= 0);
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_max_budget_nonnegative" CHECK ("maximumBudget" IS NULL OR "maximumBudget" >= 0);
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_budget_range" CHECK ("minimumBudget" IS NULL OR "maximumBudget" IS NULL OR "minimumBudget" <= "maximumBudget");

-- Offer Constraints
ALTER TABLE "Offer" ADD CONSTRAINT "chk_offer_date_range" CHECK ("endDate" > "startDate");
ALTER TABLE "Offer" ADD CONSTRAINT "chk_offer_value_nonnegative" CHECK ("value" >= 0);
ALTER TABLE "Offer" ADD CONSTRAINT "chk_offer_percentage_value" CHECK ("offerType" != 'PERCENTAGE_DISCOUNT' OR ("value" >= 0 AND "value" <= 100));

-- Display Order Constraints
ALTER TABLE "BikeImage" ADD CONSTRAINT "chk_bike_image_display_order_nonnegative" CHECK ("displayOrder" >= 0);
ALTER TABLE "SellBikeRequestImage" ADD CONSTRAINT "chk_sell_bike_image_display_order_nonnegative" CHECK ("displayOrder" >= 0);

-- -----------------------------------------------------------------------------
-- CUSTOM PARTIAL UNIQUE INDEX (ONLY ONE COVER IMAGE PER BIKE)
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX "idx_bike_image_cover" ON "BikeImage"("bikeId") WHERE "isCover" = true;

-- -----------------------------------------------------------------------------
-- CUSTOM IMMUTABILITY & APPEND-ONLY TRIGGERS
-- -----------------------------------------------------------------------------

-- Trigger 1: PurchasePayment Immutability
CREATE OR REPLACE FUNCTION fn_prevent_purchase_payment_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'PurchasePayment records are immutable ledgers and cannot be deleted.';
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF (OLD."purchaseId" != NEW."purchaseId" OR
        OLD."amount" != NEW."amount" OR
        OLD."paidAt" != NEW."paidAt" OR
        OLD."paymentMethod" != NEW."paymentMethod" OR
        OLD."receiptNumber" != NEW."receiptNumber" OR
        OLD."createdByAdminId" != NEW."createdByAdminId" OR
        OLD."createdAt" != NEW."createdAt") THEN
      RAISE EXCEPTION 'Core fields of PurchasePayment (amount, paidAt, method, receiptNumber, createdByAdminId) cannot be updated.';
    END IF;

    IF (OLD."isVoided" = true AND NEW."isVoided" = false) THEN
      RAISE EXCEPTION 'Voided PurchasePayment cannot be unvoided.';
    END IF;

    IF (OLD."isVoided" = false AND NEW."isVoided" = true) THEN
      IF (NEW."voidedAt" IS NULL OR NEW."voidReason" IS NULL OR trim(NEW."voidReason") = '') THEN
        RAISE EXCEPTION 'Voiding a PurchasePayment requires voidedAt and a non-empty voidReason.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_payment_immutability
BEFORE UPDATE OR DELETE ON "PurchasePayment"
FOR EACH ROW EXECUTE FUNCTION fn_prevent_purchase_payment_tampering();

-- Trigger 2: SalePayment Immutability
CREATE OR REPLACE FUNCTION fn_prevent_sale_payment_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'SalePayment records are immutable ledgers and cannot be deleted.';
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF (OLD."saleId" != NEW."saleId" OR
        OLD."amount" != NEW."amount" OR
        OLD."receivedAt" != NEW."receivedAt" OR
        OLD."paymentMethod" != NEW."paymentMethod" OR
        OLD."receiptNumber" != NEW."receiptNumber" OR
        OLD."receivedByAdminId" != NEW."receivedByAdminId" OR
        OLD."createdAt" != NEW."createdAt") THEN
      RAISE EXCEPTION 'Core fields of SalePayment (amount, receivedAt, method, receiptNumber, receivedByAdminId) cannot be updated.';
    END IF;

    IF (OLD."isVoided" = true AND NEW."isVoided" = false) THEN
      RAISE EXCEPTION 'Voided SalePayment cannot be unvoided.';
    END IF;

    IF (OLD."isVoided" = false AND NEW."isVoided" = true) THEN
      IF (NEW."voidedAt" IS NULL OR NEW."voidReason" IS NULL OR trim(NEW."voidReason") = '') THEN
        RAISE EXCEPTION 'Voiding a SalePayment requires voidedAt and a non-empty voidReason.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_payment_immutability
BEFORE UPDATE OR DELETE ON "SalePayment"
FOR EACH ROW EXECUTE FUNCTION fn_prevent_sale_payment_tampering();

-- Trigger 3: AuditLog Append-Only Protection
CREATE OR REPLACE FUNCTION fn_prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'AuditLog entries are immutable audit trails and cannot be deleted.';
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    RAISE EXCEPTION 'AuditLog entries are immutable audit trails and cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_append_only
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_log_tampering();

-- Trigger 4: BikeStatusHistory Append-Only Protection
CREATE OR REPLACE FUNCTION fn_prevent_bike_status_history_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    RAISE EXCEPTION 'BikeStatusHistory records are immutable history entries and cannot be deleted.';
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    RAISE EXCEPTION 'BikeStatusHistory records are immutable history entries and cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bike_status_history_append_only
BEFORE UPDATE OR DELETE ON "BikeStatusHistory"
FOR EACH ROW EXECUTE FUNCTION fn_prevent_bike_status_history_tampering();

