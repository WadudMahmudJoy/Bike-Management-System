-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_bikeId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_purchaseId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_saleId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "AdminUser_email_key";

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "normalizedEmail" VARCHAR(255) NOT NULL DEFAULT '';

-- Populate normalizedEmail for existing records if any
UPDATE "AdminUser" SET "normalizedEmail" = LOWER(TRIM("email")) WHERE "normalizedEmail" = '';

-- Remove DEFAULT clause from normalizedEmail
ALTER TABLE "AdminUser" ALTER COLUMN "normalizedEmail" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_normalizedEmail_key" ON "AdminUser"("normalizedEmail");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_voidedByAdminId_fkey" FOREIGN KEY ("voidedByAdminId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- HARDENED PAYMENT & EXPENSE LEDGER TRIGGERS & CONSTRAINTS
-- =============================================================================

-- 1. HARDENED PURCHASE PAYMENT TAMPERING TRIGGER
CREATE OR REPLACE FUNCTION fn_prevent_purchase_payment_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW."isVoided" = true OR NEW."voidedAt" IS NOT NULL OR NEW."voidedByAdminId" IS NOT NULL OR NEW."voidReason" IS NOT NULL THEN
            RAISE EXCEPTION 'A new PurchasePayment must start unvoided (isVoided = false).';
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD."isVoided" = true THEN
            RAISE EXCEPTION 'Voided PurchasePayment records are immutable ledgers and cannot be modified or unvoided.';
        END IF;
        
        IF NEW."isVoided" = false THEN
            RAISE EXCEPTION 'Core fields of PurchasePayment (amount, paidAt, paymentMethod, referenceNumber, receiptNumber, notes, createdByAdminId, purchaseId, createdAt) cannot be updated. Only voiding is allowed.';
        END IF;
        
        IF NEW."isVoided" = true THEN
            IF NEW."voidedAt" IS NULL OR NEW."voidedByAdminId" IS NULL OR NEW."voidReason" IS NULL OR btrim(NEW."voidReason") = '' THEN
                RAISE EXCEPTION 'Voiding a PurchasePayment requires voidedAt, voidedByAdminId, and a non-empty voidReason.';
            END IF;
            
            IF NEW."id" IS DISTINCT FROM OLD."id" OR
               NEW."purchaseId" IS DISTINCT FROM OLD."purchaseId" OR
               NEW."amount" IS DISTINCT FROM OLD."amount" OR
               NEW."paidAt" IS DISTINCT FROM OLD."paidAt" OR
               NEW."paymentMethod" IS DISTINCT FROM OLD."paymentMethod" OR
               NEW."referenceNumber" IS DISTINCT FROM OLD."referenceNumber" OR
               NEW."receiptNumber" IS DISTINCT FROM OLD."receiptNumber" OR
               NEW."notes" IS DISTINCT FROM OLD."notes" OR
               NEW."createdByAdminId" IS DISTINCT FROM OLD."createdByAdminId" OR
               NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
                RAISE EXCEPTION 'Core fields of PurchasePayment cannot be modified during voiding.';
            END IF;
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'PurchasePayment records are immutable ledgers and cannot be deleted.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. HARDENED SALE PAYMENT TAMPERING TRIGGER
CREATE OR REPLACE FUNCTION fn_prevent_sale_payment_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW."isVoided" = true OR NEW."voidedAt" IS NOT NULL OR NEW."voidedByAdminId" IS NOT NULL OR NEW."voidReason" IS NOT NULL THEN
            RAISE EXCEPTION 'A new SalePayment must start unvoided (isVoided = false).';
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD."isVoided" = true THEN
            RAISE EXCEPTION 'Voided SalePayment records are immutable ledgers and cannot be modified or unvoided.';
        END IF;
        
        IF NEW."isVoided" = false THEN
            RAISE EXCEPTION 'Core fields of SalePayment (amount, receivedAt, paymentMethod, referenceNumber, receiptNumber, notes, receivedByAdminId, saleId, createdAt) cannot be updated. Only voiding is allowed.';
        END IF;
        
        IF NEW."isVoided" = true THEN
            IF NEW."voidedAt" IS NULL OR NEW."voidedByAdminId" IS NULL OR NEW."voidReason" IS NULL OR btrim(NEW."voidReason") = '' THEN
                RAISE EXCEPTION 'Voiding a SalePayment requires voidedAt, voidedByAdminId, and a non-empty voidReason.';
            END IF;
            
            IF NEW."id" IS DISTINCT FROM OLD."id" OR
               NEW."saleId" IS DISTINCT FROM OLD."saleId" OR
               NEW."amount" IS DISTINCT FROM OLD."amount" OR
               NEW."receivedAt" IS DISTINCT FROM OLD."receivedAt" OR
               NEW."paymentMethod" IS DISTINCT FROM OLD."paymentMethod" OR
               NEW."referenceNumber" IS DISTINCT FROM OLD."referenceNumber" OR
               NEW."receiptNumber" IS DISTINCT FROM OLD."receiptNumber" OR
               NEW."notes" IS DISTINCT FROM OLD."notes" OR
               NEW."receivedByAdminId" IS DISTINCT FROM OLD."receivedByAdminId" OR
               NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
                RAISE EXCEPTION 'Core fields of SalePayment cannot be modified during voiding.';
            END IF;
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'SalePayment records are immutable ledgers and cannot be deleted.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. EXPENSE TAMPERING TRIGGER
CREATE OR REPLACE FUNCTION fn_prevent_expense_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW."isVoided" = true OR NEW."voidedAt" IS NOT NULL OR NEW."voidedByAdminId" IS NOT NULL OR NEW."voidReason" IS NOT NULL THEN
            RAISE EXCEPTION 'A new Expense must start unvoided (isVoided = false).';
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD."isVoided" = true THEN
            RAISE EXCEPTION 'Voided Expense records are immutable ledgers and cannot be modified or unvoided.';
        END IF;
        
        IF NEW."isVoided" = false THEN
            RAISE EXCEPTION 'Core fields of Expense (expenseNumber, category, amount, incurredDate, paymentMethod, referenceNumber, description, paidTo, receiptPath, bikeId, purchaseId, saleId, recordedByAdminId, createdAt) cannot be updated. Only voiding is allowed.';
        END IF;
        
        IF NEW."isVoided" = true THEN
            IF NEW."voidedAt" IS NULL OR NEW."voidedByAdminId" IS NULL OR NEW."voidReason" IS NULL OR btrim(NEW."voidReason") = '' THEN
                RAISE EXCEPTION 'Voiding an Expense requires voidedAt, voidedByAdminId, and a non-empty voidReason.';
            END IF;
            
            IF NEW."id" IS DISTINCT FROM OLD."id" OR
               NEW."expenseNumber" IS DISTINCT FROM OLD."expenseNumber" OR
               NEW."category" IS DISTINCT FROM OLD."category" OR
               NEW."amount" IS DISTINCT FROM OLD."amount" OR
               NEW."incurredDate" IS DISTINCT FROM OLD."incurredDate" OR
               NEW."paymentMethod" IS DISTINCT FROM OLD."paymentMethod" OR
               NEW."referenceNumber" IS DISTINCT FROM OLD."referenceNumber" OR
               NEW."description" IS DISTINCT FROM OLD."description" OR
               NEW."paidTo" IS DISTINCT FROM OLD."paidTo" OR
               NEW."receiptPath" IS DISTINCT FROM OLD."receiptPath" OR
               NEW."bikeId" IS DISTINCT FROM OLD."bikeId" OR
               NEW."purchaseId" IS DISTINCT FROM OLD."purchaseId" OR
               NEW."saleId" IS DISTINCT FROM OLD."saleId" OR
               NEW."recordedByAdminId" IS DISTINCT FROM OLD."recordedByAdminId" OR
               NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
                RAISE EXCEPTION 'Core fields of Expense cannot be modified during voiding.';
            END IF;
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Expense records are immutable ledgers and cannot be deleted.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_expense_tampering ON "Expense";
CREATE TRIGGER trg_prevent_expense_tampering
BEFORE INSERT OR UPDATE OR DELETE ON "Expense"
FOR EACH ROW EXECUTE FUNCTION fn_prevent_expense_tampering();

-- Re-apply payment void metadata CHECK constraints (incorporating voidedByAdminId)
ALTER TABLE "PurchasePayment" DROP CONSTRAINT IF EXISTS "chk_purchase_payment_void_metadata";
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "chk_purchase_payment_void_metadata" 
    CHECK (("isVoided" = false AND "voidedAt" IS NULL AND "voidedByAdminId" IS NULL AND "voidReason" IS NULL) OR 
           ("isVoided" = true AND "voidedAt" IS NOT NULL AND "voidedByAdminId" IS NOT NULL AND "voidReason" IS NOT NULL AND btrim("voidReason") != ''));

ALTER TABLE "SalePayment" DROP CONSTRAINT IF EXISTS "chk_sale_payment_void_metadata";
ALTER TABLE "SalePayment" ADD CONSTRAINT "chk_sale_payment_void_metadata" 
    CHECK (("isVoided" = false AND "voidedAt" IS NULL AND "voidedByAdminId" IS NULL AND "voidReason" IS NULL) OR 
           ("isVoided" = true AND "voidedAt" IS NOT NULL AND "voidedByAdminId" IS NOT NULL AND "voidReason" IS NOT NULL AND btrim("voidReason") != ''));

-- 4. ADDITIONAL DATABASE CONSTRAINTS (SECTION 8)

-- CustomerIdentity
ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_key_version";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_key_version" CHECK ("keyVersion" > 0);

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_encryption_bundle";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_encryption_bundle" CHECK (("encryptedNidNumber" IS NULL AND "encryptionIv" IS NULL AND "authTag" IS NULL) OR ("encryptedNidNumber" IS NOT NULL AND "encryptionIv" IS NOT NULL AND "authTag" IS NOT NULL));

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_last_four";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_last_four" CHECK ("lastFour" IS NULL OR char_length("lastFour") = 4);

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_verified_metadata";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_verified_metadata" CHECK ("nidStatus" != 'VERIFIED' OR ("verifiedAt" IS NOT NULL AND "verifiedByAdminId" IS NOT NULL));

-- CustomerBankAccount
ALTER TABLE "CustomerBankAccount" DROP CONSTRAINT IF EXISTS "chk_customer_bank_account_key_version";
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "chk_customer_bank_account_key_version" CHECK ("keyVersion" > 0);

ALTER TABLE "CustomerBankAccount" DROP CONSTRAINT IF EXISTS "chk_customer_bank_account_encryption_bundle";
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "chk_customer_bank_account_encryption_bundle" CHECK (("encryptedAccountNumber" IS NULL AND "encryptionIv" IS NULL AND "authTag" IS NULL) OR ("encryptedAccountNumber" IS NOT NULL AND "encryptionIv" IS NOT NULL AND "authTag" IS NOT NULL));

ALTER TABLE "CustomerBankAccount" DROP CONSTRAINT IF EXISTS "chk_customer_bank_account_last_four";
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "chk_customer_bank_account_last_four" CHECK ("accountNumberLastFour" IS NULL OR char_length("accountNumberLastFour") = 4);

-- CustomerDocument
ALTER TABLE "CustomerDocument" DROP CONSTRAINT IF EXISTS "chk_customer_document_file_size";
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "chk_customer_document_file_size" CHECK ("fileSize" > 0);

-- Bike
ALTER TABLE "Bike" DROP CONSTRAINT IF EXISTS "chk_bike_ownership_count";
ALTER TABLE "Bike" ADD CONSTRAINT "chk_bike_ownership_count" CHECK ("ownershipCount" IS NULL OR "ownershipCount" >= 1);

-- BikeImage
ALTER TABLE "BikeImage" DROP CONSTRAINT IF EXISTS "chk_bike_image_width";
ALTER TABLE "BikeImage" ADD CONSTRAINT "chk_bike_image_width" CHECK ("width" IS NULL OR "width" > 0);

ALTER TABLE "BikeImage" DROP CONSTRAINT IF EXISTS "chk_bike_image_height";
ALTER TABLE "BikeImage" ADD CONSTRAINT "chk_bike_image_height" CHECK ("height" IS NULL OR "height" > 0);

ALTER TABLE "BikeImage" DROP CONSTRAINT IF EXISTS "chk_bike_image_display_order";
ALTER TABLE "BikeImage" ADD CONSTRAINT "chk_bike_image_display_order" CHECK ("displayOrder" >= 0);

-- BikeRequest
ALTER TABLE "BikeRequest" DROP CONSTRAINT IF EXISTS "chk_bike_request_years";
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_years" CHECK (("minimumYear" IS NULL OR ("minimumYear" >= 1900 AND "minimumYear" <= 2100)) AND ("maximumYear" IS NULL OR ("maximumYear" >= 1900 AND "maximumYear" <= 2100)));

ALTER TABLE "BikeRequest" DROP CONSTRAINT IF EXISTS "chk_bike_request_year_range";
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_year_range" CHECK ("minimumYear" IS NULL OR "maximumYear" IS NULL OR "minimumYear" <= "maximumYear");

ALTER TABLE "BikeRequest" DROP CONSTRAINT IF EXISTS "chk_bike_request_budgets";
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_budgets" CHECK (("minimumBudget" IS NULL OR "minimumBudget" >= 0) AND ("maximumBudget" IS NULL OR "maximumBudget" >= 0));

ALTER TABLE "BikeRequest" DROP CONSTRAINT IF EXISTS "chk_bike_request_budget_range";
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_budget_range" CHECK ("minimumBudget" IS NULL OR "maximumBudget" IS NULL OR "minimumBudget" <= "maximumBudget");

ALTER TABLE "BikeRequest" DROP CONSTRAINT IF EXISTS "chk_bike_request_mileage";
ALTER TABLE "BikeRequest" ADD CONSTRAINT "chk_bike_request_mileage" CHECK ("maximumMileageKm" IS NULL OR "maximumMileageKm" >= 0);

-- SellBikeRequest
ALTER TABLE "SellBikeRequest" DROP CONSTRAINT IF EXISTS "chk_sell_bike_request_years";
ALTER TABLE "SellBikeRequest" ADD CONSTRAINT "chk_sell_bike_request_years" CHECK (("modelYear" IS NULL OR ("modelYear" >= 1900 AND "modelYear" <= 2100)) AND ("registrationYear" IS NULL OR ("registrationYear" >= 1900 AND "registrationYear" <= 2100)));

ALTER TABLE "SellBikeRequest" DROP CONSTRAINT IF EXISTS "chk_sell_bike_request_mileage";
ALTER TABLE "SellBikeRequest" ADD CONSTRAINT "chk_sell_bike_request_mileage" CHECK ("mileageKm" IS NULL OR "mileageKm" >= 0);

ALTER TABLE "SellBikeRequest" DROP CONSTRAINT IF EXISTS "chk_sell_bike_request_expected_price";
ALTER TABLE "SellBikeRequest" ADD CONSTRAINT "chk_sell_bike_request_expected_price" CHECK ("expectedPrice" IS NULL OR "expectedPrice" > 0);

-- OfferBike
ALTER TABLE "OfferBike" DROP CONSTRAINT IF EXISTS "chk_offer_bike_custom_price";
ALTER TABLE "OfferBike" ADD CONSTRAINT "chk_offer_bike_custom_price" CHECK ("customOfferPrice" IS NULL OR "customOfferPrice" > 0);

-- Sale
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "chk_sale_listed_price";
ALTER TABLE "Sale" ADD CONSTRAINT "chk_sale_listed_price" CHECK ("listedPrice" > 0);

ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "chk_sale_discount";
ALTER TABLE "Sale" ADD CONSTRAINT "chk_sale_discount" CHECK ("discountAmount" >= 0);

ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "chk_sale_final_price";
ALTER TABLE "Sale" ADD CONSTRAINT "chk_sale_final_price" CHECK ("finalPrice" >= 0);

ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "chk_sale_price_equation";
ALTER TABLE "Sale" ADD CONSTRAINT "chk_sale_price_equation" CHECK ("finalPrice" = ("listedPrice" - "discountAmount"));

-- Expense
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "chk_expense_amount";
ALTER TABLE "Expense" ADD CONSTRAINT "chk_expense_amount" CHECK ("amount" > 0);

ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "chk_expense_void_metadata";
ALTER TABLE "Expense" ADD CONSTRAINT "chk_expense_void_metadata" CHECK (("isVoided" = false AND "voidedAt" IS NULL AND "voidedByAdminId" IS NULL AND "voidReason" IS NULL) OR ("isVoided" = true AND "voidedAt" IS NOT NULL AND "voidedByAdminId" IS NOT NULL AND "voidReason" IS NOT NULL AND btrim("voidReason") != ''));
