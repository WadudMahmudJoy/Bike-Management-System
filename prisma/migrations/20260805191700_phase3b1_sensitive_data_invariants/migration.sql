-- Migration: 20260805191700_phase3b1_sensitive_data_invariants

-- =============================================================================
-- 1. READ-ONLY FAIL-FAST LEGACY COMPATIBILITY ASSERTIONS
-- =============================================================================
DO $$
DECLARE
    v_invalid_pending INT;
    v_invalid_populated INT;
    v_invalid_verified INT;
    v_invalid_bank_accounts INT;
BEGIN
    -- Check PENDING CustomerIdentity compatibility:
    -- PENDING must have ALL sensitive and verification fields NULL
    SELECT COUNT(*) INTO v_invalid_pending
    FROM "CustomerIdentity"
    WHERE "nidStatus" = 'PENDING' AND (
        "encryptedNidNumber" IS NOT NULL OR
        "encryptionIv" IS NOT NULL OR
        "authTag" IS NOT NULL OR
        "nidNumberHmac" IS NOT NULL OR
        "lastFour" IS NOT NULL OR
        "submittedAt" IS NOT NULL OR
        "verifiedAt" IS NOT NULL OR
        "verifiedByAdminId" IS NOT NULL
    );

    IF v_invalid_pending > 0 THEN
        RAISE EXCEPTION 'Migration aborted: Found % CustomerIdentity PENDING row(s) with populated sensitive fields.', v_invalid_pending;
    END IF;

    -- Check Non-PENDING CustomerIdentity compatibility:
    -- Non-PENDING must have full bundle (encryptedNidNumber, encryptionIv, authTag, nidNumberHmac, lastFour, submittedAt)
    SELECT COUNT(*) INTO v_invalid_populated
    FROM "CustomerIdentity"
    WHERE "nidStatus" != 'PENDING' AND (
        "encryptedNidNumber" IS NULL OR
        "encryptionIv" IS NULL OR
        "authTag" IS NULL OR
        "nidNumberHmac" IS NULL OR
        "lastFour" IS NULL OR
        "submittedAt" IS NULL
    );

    IF v_invalid_populated > 0 THEN
        RAISE EXCEPTION 'Migration aborted: Found % non-PENDING CustomerIdentity row(s) with incomplete encryption bundles.', v_invalid_populated;
    END IF;

    -- Check VERIFIED CustomerIdentity compatibility:
    SELECT COUNT(*) INTO v_invalid_verified
    FROM "CustomerIdentity"
    WHERE ("nidStatus" = 'VERIFIED' AND ("verifiedAt" IS NULL OR "verifiedByAdminId" IS NULL))
       OR ("nidStatus" != 'VERIFIED' AND ("verifiedAt" IS NOT NULL OR "verifiedByAdminId" IS NOT NULL));

    IF v_invalid_verified > 0 THEN
        RAISE EXCEPTION 'Migration aborted: Found % CustomerIdentity row(s) with invalid verification metadata.', v_invalid_verified;
    END IF;

    -- Check CustomerBankAccount compatibility:
    -- All bank accounts must have full encryption bundle
    SELECT COUNT(*) INTO v_invalid_bank_accounts
    FROM "CustomerBankAccount"
    WHERE "encryptedAccountNumber" IS NULL
       OR "encryptionIv" IS NULL
       OR "authTag" IS NULL
       OR "accountNumberLastFour" IS NULL;

    IF v_invalid_bank_accounts > 0 THEN
        RAISE EXCEPTION 'Migration aborted: Found % CustomerBankAccount row(s) with missing encryption fields.', v_invalid_bank_accounts;
    END IF;
END $$;

-- =============================================================================
-- 2. ALTER COLUMNS & DATA NORMALIZATION
-- =============================================================================

-- Drop keyVersion default and NOT NULL from CustomerIdentity
ALTER TABLE "CustomerIdentity" ALTER COLUMN "keyVersion" DROP DEFAULT;
ALTER TABLE "CustomerIdentity" ALTER COLUMN "keyVersion" DROP NOT NULL;

-- Normalize keyVersion to NULL ONLY for verified PENDING identities
UPDATE "CustomerIdentity"
SET "keyVersion" = NULL
WHERE "nidStatus" = 'PENDING';

-- Drop keyVersion default and set NOT NULL constraints on CustomerBankAccount
ALTER TABLE "CustomerBankAccount" ALTER COLUMN "keyVersion" DROP DEFAULT;
ALTER TABLE "CustomerBankAccount" ALTER COLUMN "encryptedAccountNumber" SET NOT NULL;
ALTER TABLE "CustomerBankAccount" ALTER COLUMN "encryptionIv" SET NOT NULL;
ALTER TABLE "CustomerBankAccount" ALTER COLUMN "authTag" SET NOT NULL;
ALTER TABLE "CustomerBankAccount" ALTER COLUMN "accountNumberLastFour" SET NOT NULL;

-- =============================================================================
-- 3. REPLACE CONSTRAINTS ON CustomerIdentity
-- =============================================================================

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_key_version";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_key_version"
    CHECK ("keyVersion" IS NULL OR "keyVersion" > 0);

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_encryption_bundle";
ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_pending_bundle";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_pending_bundle"
    CHECK (
        "nidStatus" != 'PENDING' OR (
            "encryptedNidNumber" IS NULL AND
            "encryptionIv" IS NULL AND
            "authTag" IS NULL AND
            "keyVersion" IS NULL AND
            "nidNumberHmac" IS NULL AND
            "lastFour" IS NULL AND
            "submittedAt" IS NULL AND
            "verifiedAt" IS NULL AND
            "verifiedByAdminId" IS NULL
        )
    );

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_populated_bundle";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_populated_bundle"
    CHECK (
        "nidStatus" = 'PENDING' OR (
            "encryptedNidNumber" IS NOT NULL AND
            "encryptionIv" IS NOT NULL AND
            "authTag" IS NOT NULL AND
            "keyVersion" IS NOT NULL AND
            "nidNumberHmac" IS NOT NULL AND
            "lastFour" IS NOT NULL AND
            "submittedAt" IS NOT NULL
        )
    );

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_last_four";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_last_four"
    CHECK ("lastFour" IS NULL OR "lastFour" ~ '^[0-9]{4}$');

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_hmac_format";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_hmac_format"
    CHECK ("nidNumberHmac" IS NULL OR "nidNumberHmac" ~ '^[a-f0-9]{64}$');

ALTER TABLE "CustomerIdentity" DROP CONSTRAINT IF EXISTS "chk_customer_identity_verified_metadata";
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "chk_customer_identity_verified_metadata"
    CHECK (
        ("nidStatus" = 'VERIFIED' AND "verifiedAt" IS NOT NULL AND "verifiedByAdminId" IS NOT NULL) OR
        ("nidStatus" != 'VERIFIED' AND "verifiedAt" IS NULL AND "verifiedByAdminId" IS NULL)
    );

-- =============================================================================
-- 4. REPLACE CONSTRAINTS ON CustomerBankAccount
-- =============================================================================

ALTER TABLE "CustomerBankAccount" DROP CONSTRAINT IF EXISTS "chk_customer_bank_account_key_version";
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "chk_customer_bank_account_key_version"
    CHECK ("keyVersion" > 0);

ALTER TABLE "CustomerBankAccount" DROP CONSTRAINT IF EXISTS "chk_customer_bank_account_encryption_bundle";

ALTER TABLE "CustomerBankAccount" DROP CONSTRAINT IF EXISTS "chk_customer_bank_account_last_four";
ALTER TABLE "CustomerBankAccount" ADD CONSTRAINT "chk_customer_bank_account_last_four"
    CHECK ("accountNumberLastFour" ~ '^[0-9]{4}$');
