import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}

async function runIntegrityTests() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  let passedCount = 0;

  console.log("Starting Comprehensive Database Integrity & Trigger Test Suite (in ROLLBACK transaction)...");

  try {
    await client.query("BEGIN;");

    // Synthetic Prerequisites Creation
    const adminRes = await client.query(`
      INSERT INTO "AdminUser" ("id", "email", "normalizedEmail", "passwordHash", "name", "role", "isActive", "updatedAt")
      VALUES (gen_random_uuid(), 'integrity_admin@sristydristy.local', 'integrity_admin@sristydristy.local', 'hash', 'Test Admin', 'ADMIN', true, NOW())
      RETURNING "id";
    `);
    const adminId = adminRes.rows[0].id;

    const sellerRes = await client.query(`
      INSERT INTO "Customer" ("id", "fullName", "phone", "phoneNormalized", "updatedAt")
      VALUES (gen_random_uuid(), 'Synthetic Seller', '01711111111', '+8801711111111', NOW())
      RETURNING "id";
    `);
    const sellerId = sellerRes.rows[0].id;

    const buyerRes = await client.query(`
      INSERT INTO "Customer" ("id", "fullName", "phone", "phoneNormalized", "updatedAt")
      VALUES (gen_random_uuid(), 'Synthetic Buyer', '01822222222', '+8801822222222', NOW())
      RETURNING "id";
    `);
    const buyerId = buyerRes.rows[0].id;

    const bikeRes = await client.query(`
      INSERT INTO "Bike" ("id", "stockCode", "slug", "brand", "model", "modelYear", "engineCapacityCc", "mileageKm", "color", "updatedAt")
      VALUES (gen_random_uuid(), 'STK-INT-001', 'synthetic-test-bike-001', 'Yamaha', 'FZ-S V3', 2023, 149, 3500, 'Blue', NOW())
      RETURNING "id";
    `);
    const bikeId = bikeRes.rows[0].id;

    const purchaseRes = await client.query(`
      INSERT INTO "Purchase" ("id", "purchaseNumber", "bikeId", "sellerId", "purchaseDate", "agreedPrice", "createdByAdminId", "updatedAt")
      VALUES (gen_random_uuid(), 'PUR-INT-001', '${bikeId}', '${sellerId}', NOW(), 160000.00, '${adminId}', NOW())
      RETURNING "id";
    `);
    const purchaseId = purchaseRes.rows[0].id;

    const saleRes = await client.query(`
      INSERT INTO "Sale" ("id", "saleNumber", "bikeId", "buyerId", "saleDate", "listedPrice", "discountAmount", "finalPrice", "createdByAdminId", "updatedAt")
      VALUES (gen_random_uuid(), 'SAL-INT-001', '${bikeId}', '${buyerId}', NOW(), 190000.00, 10000.00, 180000.00, '${adminId}', NOW())
      RETURNING "id";
    `);
    const saleId = saleRes.rows[0].id;

    // Helper for testing queries that must fail
    async function assertFailure(sql: string, expectedSubstrings: string[], testName: string) {
      await client.query("SAVEPOINT test_sp;");
      try {
        await client.query(sql);
        await client.query("RELEASE SAVEPOINT test_sp;");
        throw new Error(`FAILED [${testName}]: Expected exception containing [${expectedSubstrings.join(" OR ")}], but query succeeded.`);
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message.startsWith("FAILED [")) throw error;
        await client.query("ROLLBACK TO SAVEPOINT test_sp;");
        const matched = expectedSubstrings.some(sub => error.message.includes(sub));
        if (!matched) {
          throw new Error(`FAILED [${testName}]: Expected error containing [${expectedSubstrings.join(" OR ")}], but got: "${error.message}"`);
        }
        passedCount++;
        console.log(`  [PASS ${passedCount}] ${testName}`);
      }
    }

    // Helper for testing queries that must succeed
    async function assertSuccess(sql: string, testName: string) {
      await client.query(sql);
      passedCount++;
      console.log(`  [PASS ${passedCount}] ${testName}`);
    }

    // =========================================================================
    // 1. PURCHASE PAYMENT TESTS
    // =========================================================================
    const purPayRes = await client.query(`
      INSERT INTO "PurchasePayment" ("id", "purchaseId", "amount", "paidAt", "paymentMethod", "receiptNumber", "createdByAdminId")
      VALUES (gen_random_uuid(), '${purchaseId}', 60000.00, NOW(), 'CASH', 'REC-PUR-INT-001', '${adminId}')
      RETURNING "id";
    `);
    const purPayId = purPayRes.rows[0].id;
    passedCount++;
    console.log(`  [PASS ${passedCount}] PurchasePayment normal insert succeeded.`);

    await assertFailure(
      `INSERT INTO "PurchasePayment" ("id", "purchaseId", "amount", "paidAt", "paymentMethod", "receiptNumber", "createdByAdminId", "isVoided") VALUES (gen_random_uuid(), '${purchaseId}', 10000.00, NOW(), 'CASH', 'REC-PUR-BAD', '${adminId}', true);`,
      ["must start unvoided", "chk_purchase_payment_void"],
      "PurchasePayment pre-voided insert rejected"
    );

    await assertFailure(
      `UPDATE "PurchasePayment" SET "amount" = 70000.00 WHERE "id" = '${purPayId}';`,
      ["cannot be updated", "Core fields of PurchasePayment"],
      "PurchasePayment amount update rejected"
    );

    await assertFailure(
      `UPDATE "PurchasePayment" SET "referenceNumber" = 'REF-MUTATED' WHERE "id" = '${purPayId}';`,
      ["cannot be updated", "Core fields of PurchasePayment"],
      "PurchasePayment reference-number update rejected"
    );

    await assertFailure(
      `UPDATE "PurchasePayment" SET "notes" = 'Updated note' WHERE "id" = '${purPayId}';`,
      ["cannot be updated", "Core fields of PurchasePayment"],
      "PurchasePayment notes update rejected"
    );

    await assertFailure(
      `DELETE FROM "PurchasePayment" WHERE "id" = '${purPayId}';`,
      ["cannot be deleted"],
      "PurchasePayment delete rejected"
    );

    await assertFailure(
      `UPDATE "PurchasePayment" SET "isVoided" = true WHERE "id" = '${purPayId}';`,
      ["requires voidedAt", "chk_purchase_payment_void"],
      "PurchasePayment void without voidedAt rejected"
    );

    await assertFailure(
      `UPDATE "PurchasePayment" SET "isVoided" = true, "voidedAt" = NOW() WHERE "id" = '${purPayId}';`,
      ["requires voidedAt", "chk_purchase_payment_void"],
      "PurchasePayment void without voidedByAdminId rejected"
    );

    await assertFailure(
      `UPDATE "PurchasePayment" SET "isVoided" = true, "voidedAt" = NOW(), "voidedByAdminId" = '${adminId}', "voidReason" = '  ' WHERE "id" = '${purPayId}';`,
      ["non-empty voidReason", "chk_purchase_payment_void"],
      "PurchasePayment void without nonempty reason rejected"
    );

    await assertSuccess(
      `UPDATE "PurchasePayment" SET "isVoided" = true, "voidedAt" = NOW(), "voidedByAdminId" = '${adminId}', "voidReason" = 'Duplicate payment entry' WHERE "id" = '${purPayId}';`,
      "PurchasePayment complete void succeeded."
    );

    await assertFailure(
      `UPDATE "PurchasePayment" SET "isVoided" = false WHERE "id" = '${purPayId}';`,
      ["cannot be modified or unvoided"],
      "PurchasePayment unvoid rejected"
    );

    await assertFailure(
      `UPDATE "PurchasePayment" SET "voidReason" = 'Altered reason' WHERE "id" = '${purPayId}';`,
      ["cannot be modified or unvoided"],
      "PurchasePayment changing void metadata after void rejected"
    );

    // =========================================================================
    // 2. SALE PAYMENT TESTS
    // =========================================================================
    const salePayRes = await client.query(`
      INSERT INTO "SalePayment" ("id", "saleId", "amount", "receivedAt", "paymentMethod", "receiptNumber", "receivedByAdminId")
      VALUES (gen_random_uuid(), '${saleId}', 100000.00, NOW(), 'BANK_TRANSFER', 'REC-SAL-INT-001', '${adminId}')
      RETURNING "id";
    `);
    const salePayId = salePayRes.rows[0].id;
    passedCount++;
    console.log(`  [PASS ${passedCount}] SalePayment normal insert succeeded.`);

    await assertFailure(
      `INSERT INTO "SalePayment" ("id", "saleId", "amount", "receivedAt", "paymentMethod", "receiptNumber", "receivedByAdminId", "isVoided") VALUES (gen_random_uuid(), '${saleId}', 10000.00, NOW(), 'CASH', 'REC-SAL-BAD', '${adminId}', true);`,
      ["must start unvoided", "chk_sale_payment_void"],
      "SalePayment pre-voided insert rejected"
    );

    await assertFailure(
      `UPDATE "SalePayment" SET "amount" = 120000.00 WHERE "id" = '${salePayId}';`,
      ["cannot be updated", "Core fields of SalePayment"],
      "SalePayment core field update rejected"
    );

    await assertFailure(
      `DELETE FROM "SalePayment" WHERE "id" = '${salePayId}';`,
      ["cannot be deleted"],
      "SalePayment delete rejected"
    );

    await assertFailure(
      `UPDATE "SalePayment" SET "isVoided" = true, "voidedAt" = NOW() WHERE "id" = '${salePayId}';`,
      ["requires voidedAt", "chk_sale_payment_void"],
      "SalePayment incomplete void rejected"
    );

    await assertSuccess(
      `UPDATE "SalePayment" SET "isVoided" = true, "voidedAt" = NOW(), "voidedByAdminId" = '${adminId}', "voidReason" = 'Customer returned check' WHERE "id" = '${salePayId}';`,
      "SalePayment valid void succeeded."
    );

    await assertFailure(
      `UPDATE "SalePayment" SET "isVoided" = false WHERE "id" = '${salePayId}';`,
      ["cannot be modified or unvoided"],
      "SalePayment unvoid rejected"
    );

    await assertFailure(
      `UPDATE "SalePayment" SET "voidReason" = 'Altered reason' WHERE "id" = '${salePayId}';`,
      ["cannot be modified or unvoided"],
      "SalePayment post-void metadata change rejected"
    );

    // =========================================================================
    // 3. EXPENSE TESTS
    // =========================================================================
    const expRes = await client.query(`
      INSERT INTO "Expense" ("id", "expenseNumber", "category", "amount", "incurredDate", "paymentMethod", "description", "recordedByAdminId", "updatedAt")
      VALUES (gen_random_uuid(), 'EXP-INT-001', 'REPAIR', 5000.00, NOW(), 'CASH', 'Synthetic engine repair', '${adminId}', NOW())
      RETURNING "id";
    `);
    const expId = expRes.rows[0].id;
    passedCount++;
    console.log(`  [PASS ${passedCount}] Expense normal insert succeeded.`);

    await assertFailure(
      `UPDATE "Expense" SET "amount" = 6000.00 WHERE "id" = '${expId}';`,
      ["cannot be updated", "Core fields of Expense"],
      "Expense core update rejected"
    );

    await assertFailure(
      `DELETE FROM "Expense" WHERE "id" = '${expId}';`,
      ["cannot be deleted"],
      "Expense delete rejected"
    );

    await assertFailure(
      `UPDATE "Expense" SET "isVoided" = true WHERE "id" = '${expId}';`,
      ["requires voidedAt", "chk_expense_void"],
      "Expense incomplete void rejected"
    );

    await assertSuccess(
      `UPDATE "Expense" SET "isVoided" = true, "voidedAt" = NOW(), "voidedByAdminId" = '${adminId}', "voidReason" = 'Double entered expense' WHERE "id" = '${expId}';`,
      "Expense valid void succeeded."
    );

    await assertFailure(
      `UPDATE "Expense" SET "description" = 'Mutated description' WHERE "id" = '${expId}';`,
      ["cannot be modified or unvoided"],
      "Expense post-void mutation rejected"
    );

    // =========================================================================
    // 4. AUDIT LOG TESTS
    // =========================================================================
    const auditRes = await client.query(`
      INSERT INTO "AuditLog" ("id", "action", "entityType", "entityId")
      VALUES (gen_random_uuid(), 'SYNTHETIC_TEST', 'Sale', '${saleId}')
      RETURNING "id";
    `);
    const auditId = auditRes.rows[0].id;

    await assertFailure(
      `UPDATE "AuditLog" SET "action" = 'MUTATED' WHERE "id" = '${auditId}';`,
      ["cannot be modified"],
      "AuditLog update rejected"
    );

    await assertFailure(
      `DELETE FROM "AuditLog" WHERE "id" = '${auditId}';`,
      ["cannot be deleted"],
      "AuditLog delete rejected"
    );

    // =========================================================================
    // 5. BIKE STATUS HISTORY TESTS
    // =========================================================================
    const statusHistRes = await client.query(`
      INSERT INTO "BikeStatusHistory" ("id", "bikeId", "previousStatus", "newStatus", "reason")
      VALUES (gen_random_uuid(), '${bikeId}', 'DRAFT', 'AVAILABLE', 'Synthetic check')
      RETURNING "id";
    `);
    const statusHistId = statusHistRes.rows[0].id;

    await assertFailure(
      `UPDATE "BikeStatusHistory" SET "reason" = 'Mutated' WHERE "id" = '${statusHistId}';`,
      ["cannot be modified"],
      "BikeStatusHistory update rejected"
    );

    await assertFailure(
      `DELETE FROM "BikeStatusHistory" WHERE "id" = '${statusHistId}';`,
      ["cannot be deleted"],
      "BikeStatusHistory delete rejected"
    );

    // =========================================================================
    // 6. COVER IMAGE PARTIAL UNIQUE INDEX TEST
    // =========================================================================
    await client.query(`
      INSERT INTO "BikeImage" ("id", "bikeId", "storageKey", "displayOrder", "isCover")
      VALUES (gen_random_uuid(), '${bikeId}', 'img-1.jpg', 0, true);
    `);

    await assertFailure(
      `INSERT INTO "BikeImage" ("id", "bikeId", "storageKey", "displayOrder", "isCover") VALUES (gen_random_uuid(), '${bikeId}', 'img-2.jpg', 1, true);`,
      ["idx_bike_image_cover"],
      "Second cover image for the same bike rejected"
    );

    // =========================================================================
    // 7. SCHEMA CONSTRAINTS TESTS
    // =========================================================================
    await assertFailure(
      `INSERT INTO "Bike" ("id", "stockCode", "slug", "brand", "model", "modelYear", "engineCapacityCc", "mileageKm", "color", "updatedAt") VALUES (gen_random_uuid(), 'STK-BAD-1', 'bad-1', 'B', 'M', 2020, 150, -100, 'Black', NOW());`,
      ["chk_bike_mileage"],
      "Negative mileage rejected"
    );

    await assertFailure(
      `INSERT INTO "Bike" ("id", "stockCode", "slug", "brand", "model", "modelYear", "engineCapacityCc", "mileageKm", "color", "updatedAt") VALUES (gen_random_uuid(), 'STK-BAD-2', 'bad-2', 'B', 'M', 1850, 150, 1000, 'Black', NOW());`,
      ["chk_bike_model_year"],
      "Invalid year rejected"
    );

    await assertFailure(
      `INSERT INTO "BikeRequest" ("id", "requesterName", "requesterPhoneNormalized", "preferredBrand", "preferredModel", "minimumBudget", "maximumBudget", "updatedAt") VALUES (gen_random_uuid(), 'Req', '017', 'B', 'M', 200000.00, 100000.00, NOW());`,
      ["chk_bike_request_budget_range"],
      "Invalid budget range rejected"
    );

    await assertFailure(
      `INSERT INTO "CustomerDocument" ("id", "customerId", "documentType", "storageKey", "originalFileName", "mimeType", "fileSize") VALUES (gen_random_uuid(), '${sellerId}', 'NID_FRONT', 'key', 'file.jpg', 'image/jpeg', -50);`,
      ["chk_customer_document_file_size"],
      "Invalid file size rejected"
    );

    await assertFailure(
      `INSERT INTO "CustomerIdentity" ("id", "customerId", "encryptedNidNumber", "updatedAt") VALUES (gen_random_uuid(), '${sellerId}', 'enc_data', NOW());`,
      ["chk_customer_identity_pending_bundle", "chk_customer_identity_populated_bundle"],
      "Invalid PENDING CustomerIdentity partial encryption bundle rejected"
    );

    await assertFailure(
      `INSERT INTO "CustomerIdentity" ("id", "customerId", "nidStatus", "encryptedNidNumber", "encryptionIv", "authTag", "keyVersion", "nidNumberHmac", "lastFour", "submittedAt", "updatedAt") VALUES (gen_random_uuid(), '${sellerId}', 'SUBMITTED', 'enc_data', 'iv', 'tag', 1, 'invalid_hmac', '1234', NOW(), NOW());`,
      ["chk_customer_identity_hmac_format"],
      "Invalid CustomerIdentity 64-char hex HMAC rejected"
    );

    await assertFailure(
      `INSERT INTO "CustomerIdentity" ("id", "customerId", "nidStatus", "encryptedNidNumber", "encryptionIv", "authTag", "keyVersion", "nidNumberHmac", "lastFour", "submittedAt", "updatedAt") VALUES (gen_random_uuid(), '${sellerId}', 'VERIFIED', 'enc_data', 'iv', 'tag', 1, '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', '1234', NOW(), NOW());`,
      ["chk_customer_identity_verified_metadata"],
      "VERIFIED status without verifiedAt/verifiedByAdminId rejected"
    );

    await assertFailure(
      `INSERT INTO "CustomerBankAccount" ("id", "customerId", "bankName", "accountHolderName", "encryptedAccountNumber", "encryptionIv", "authTag", "keyVersion", "accountNumberLastFour", "updatedAt") VALUES (gen_random_uuid(), '${sellerId}', 'Bank', 'Holder', 'enc', 'iv', 'tag', 1, '123', NOW());`,
      ["chk_customer_bank_account_last_four"],
      "Invalid CustomerBankAccount last-four length rejected"
    );

    console.log(`\nALL ${passedCount} INTEGRITY & TRIGGER TESTS PASSED CLEANLY! Rolling back test transaction...`);
  } finally {
    await client.query("ROLLBACK;");
    client.release();
    await pool.end();
  }
}

runIntegrityTests().catch((err: unknown) => {
  console.error("Integrity test suite failed:", err);
  process.exit(1);
});
