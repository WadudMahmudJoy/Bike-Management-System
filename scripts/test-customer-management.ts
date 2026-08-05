import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import {
  createCustomer,
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
  CUSTOMER_ERRORS,
} from "../src/lib/customer/service";
import { getCustomerList, getCustomerById } from "../src/lib/customer/queries";
import { normalizeBangladeshPhone, maskPhone } from "../src/lib/customer/phone";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runCustomerIntegrationTests() {
  console.log("=== Phase 3A.2: Customer Management Integration Test Suite ===");

  let testFailed = false;

  try {
    // Run all integration tests inside a serializable transaction that is rolled back at the end
    await prisma.$transaction(
      async (tx) => {
        // 1. Setup synthetic test admin user
        const testEmail = `test-admin-${Date.now()}@example.com`;
        const testAdmin = await tx.adminUser.create({
          data: {
            email: testEmail,
            normalizedEmail: testEmail.toLowerCase(),
            passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$synthetic$synthetic",
            name: "Test Customer Admin",
            role: "ADMIN",
            isActive: true,
          },
        });
        const testAdminId = testAdmin.id;
        console.log(`[PASS] Synthetic test admin created: ${testAdmin.id}`);

        // 2. Test Phone Normalization & Masking
        const rawPhone = "01712 345 678";
        const normPhone = normalizeBangladeshPhone(rawPhone);
        if (normPhone !== "+8801712345678") {
          throw new Error(`Phone normalization failed: expected +8801712345678, got ${normPhone}`);
        }
        const masked = maskPhone(rawPhone);
        if (!masked.includes("***") || masked.includes("345")) {
          throw new Error(`Phone masking failed: ${masked}`);
        }
        console.log("[PASS] Phone normalization and masking verified");

        const testPhone = `01711${Math.floor(100000 + Math.random() * 900000)}`;

        // 3. Test Customer Creation with whitespace optional field normalization
        const createResult = await createCustomer(testAdminId, {
          fullName: "Test Customer One",
          fatherName: "   ", // whitespace only -> null
          phone: testPhone,
          whatsappNumber: "   ", // whitespace only -> null
          email: "customer1@test.local",
          address: "123 Test Street, Dhaka",
          emergencyContact: "Emergency: 01511112233",
          internalNotes: "Sensitive internal test notes",
          roles: ["BUYER", "SELLER"],
        }, tx);

        if (!createResult.success) {
          throw new Error(`Customer 1 creation failed: ${createResult.error}`);
        }

        const customer1Id = createResult.data.customerId;
        const customer1 = await getCustomerById(customer1Id, tx);
        if (!customer1) throw new Error("Failed to retrieve created Customer 1");

        console.log(`[PASS] Created Customer 1: ${customer1.customerCode} (${customer1.id})`);

        if (customer1.fatherName !== null || customer1.whatsappNumber !== null) {
          throw new Error("Whitespace-only optional fields were not normalized to null");
        }

        // Verify createdByAdmin exposes name but excludes email
        if (!customer1.createdByAdmin || customer1.createdByAdmin.name !== "Test Customer Admin") {
          throw new Error("Created by admin name was not populated correctly");
        }
        if ("email" in (customer1.createdByAdmin as Record<string, unknown>)) {
          throw new Error("createdByAdmin unexpectedly exposed admin email address");
        }

        // Verify Customer Code shape (CUS-XXXXXXXX, Crockford Base32)
        if (!/^CUS-[0-9A-HJKMNPQRSTVWXYZ]{8}$/.test(customer1.customerCode)) {
          throw new Error(`Invalid Customer Code format: ${customer1.customerCode}`);
        }

        // Verify Customer Identity status is PENDING with NO raw NID
        const identity1 = await tx.customerIdentity.findUnique({
          where: { customerId: customer1.id },
        });
        if (!identity1 || identity1.nidStatus !== "PENDING") {
          throw new Error("Customer Identity default status is not PENDING");
        }
        if (identity1.encryptedNidNumber !== null || identity1.nidNumberHmac !== null) {
          throw new Error("Raw or encrypted NID data was unexpectedly stored in Phase 3A");
        }

        // Verify NO CustomerBankAccount was created
        const bankCount = await tx.customerBankAccount.count({
          where: { customerId: customer1.id },
        });
        if (bankCount !== 0) {
          throw new Error("Customer bank account was unexpectedly created in Phase 3A");
        }

        console.log("[PASS] Customer 1 Code, PENDING identity status, whitespace normalization, admin email exclusion, and zero bank accounts verified");

        // 4. Test Controlled Duplicate Phone Workflow
        const dupAttempt = await createCustomer(testAdminId, {
          fullName: "Test Customer Two (Shared Phone)",
          phone: testPhone, // Same phone as Customer 1
          roles: ["BUYER"],
        }, tx);

        if (dupAttempt.success || !dupAttempt.duplicateWarning?.hasDuplicates) {
          throw new Error("Duplicate phone creation without confirmation did not trigger duplicate warning");
        }

        const matchingIds = dupAttempt.duplicateWarning.duplicateCustomerIds;
        if (!matchingIds.includes(customer1.id)) {
          throw new Error("Duplicate check failed to return matching Customer 1 ID");
        }

        console.log("[PASS] Controlled duplicate phone warning triggered correctly");

        // Test mismatched expected duplicate IDs rejection
        const mismatchDupResult = await createCustomer(testAdminId, {
          fullName: "Test Customer Two (Shared Phone)",
          phone: testPhone,
          roles: ["BUYER"],
          confirmDuplicate: true,
          expectedDuplicateCustomerIds: ["00000000-0000-4000-a000-000000000000"], // valid UUID string but wrong ID
        }, tx);

        if (mismatchDupResult.success || mismatchDupResult.error !== CUSTOMER_ERRORS.DUPLICATE_SET_CHANGED) {
          throw new Error("Mismatched expected duplicate ID set was not rejected with DUPLICATE_SET_CHANGED");
        }

        console.log("[PASS] Mismatched duplicate set confirmation rejection verified");

        // Confirm duplicate creation with exact matching IDs
        const dupConfirmResult = await createCustomer(testAdminId, {
          fullName: "Test Customer Two (Shared Phone)",
          phone: testPhone,
          roles: ["BUYER"],
          confirmDuplicate: true,
          expectedDuplicateCustomerIds: matchingIds,
        }, tx);

        if (!dupConfirmResult.success) {
          throw new Error(`Duplicate confirmed creation failed: ${dupConfirmResult.error}`);
        }

        const customer2Id = dupConfirmResult.data.customerId;
        const customer2 = await getCustomerById(customer2Id, tx);
        if (!customer2) throw new Error("Failed to retrieve created Customer 2");

        if (customer1.id === customer2.id || customer1.customerCode === customer2.customerCode) {
          throw new Error("Shared phone records failed to produce distinct customer entities");
        }

        console.log(`[PASS] Created Customer 2 with shared family phone: ${customer2.customerCode}`);

        // 5. Test Unchanged-Phone Update (Does NOT require duplicate confirmation)
        const unchangedPhoneUpdate = await updateCustomer(testAdminId, customer1.id, {
          fullName: "Test Customer One Updated (Name Only)",
          phone: testPhone, // Unchanged phone
          roles: ["BUYER", "POTENTIAL_SELLER"],
          expectedUpdatedAt: customer1.updatedAt,
          confirmDuplicate: false, // Should NOT be required when phone is unchanged!
        }, tx);

        if (!unchangedPhoneUpdate.success) {
          throw new Error(`Unchanged phone update failed unexpectedly: ${unchangedPhoneUpdate.error}`);
        }

        const updatedCustomer1 = await getCustomerById(customer1.id, tx);
        if (!updatedCustomer1 || updatedCustomer1.fullName !== "Test Customer One Updated (Name Only)") {
          throw new Error("Customer name was not updated correctly on unchanged phone edit");
        }

        console.log("[PASS] Unchanged-phone update succeeded without requiring duplicate confirmation");

        // Test Changing Phone to a Duplicate Phone (Requires duplicate confirmation)
        const distinctPhone = `01811${Math.floor(100000 + Math.random() * 900000)}`;
        const customer3Res = await createCustomer(testAdminId, {
          fullName: "Test Customer Three",
          phone: distinctPhone,
          roles: ["BUYER"],
        }, tx);
        if (!customer3Res.success) throw new Error("Failed to create Customer 3");

        // Attempt updating Customer 3's phone to testPhone (which exists on Customer 1 and 2)
        const phoneChangeDupRes = await updateCustomer(testAdminId, customer3Res.data.customerId, {
          fullName: "Test Customer Three",
          phone: testPhone, // Changing to duplicate phone
          roles: ["BUYER"],
          expectedUpdatedAt: (await getCustomerById(customer3Res.data.customerId, tx))!.updatedAt,
          confirmDuplicate: false,
        }, tx);

        if (phoneChangeDupRes.success || !phoneChangeDupRes.duplicateWarning?.hasDuplicates) {
          throw new Error("Changing phone to duplicate phone did not trigger duplicate warning");
        }

        console.log("[PASS] Changing phone to duplicate phone triggered duplicate warning");

        // Test Stale Update Rejection (Concurrency Conflict)
        const staleUpdateResult = await updateCustomer(testAdminId, customer1.id, {
          fullName: "Stale Update Attempt",
          phone: testPhone,
          roles: ["BUYER"],
          expectedUpdatedAt: customer1.updatedAt, // Old updatedAt before previous update
        }, tx);

        if (staleUpdateResult.success || staleUpdateResult.error !== CUSTOMER_ERRORS.CONCURRENCY_CONFLICT) {
          throw new Error("Stale update attempt was not rejected with CONCURRENCY_CONFLICT error");
        }

        console.log("[PASS] Optimistic concurrency conflict rejection verified");

        // 6. Test Bounded Search & Querying with Overlong Query Safety
        const listResult = await getCustomerList({
          query: testPhone,
          limit: 20,
        }, tx);

        if (listResult.total < 2) {
          throw new Error(`Expected at least 2 search results by phone, got ${listResult.total}`);
        }
        // Verify list query masks phone numbers
        listResult.customers.forEach((c) => {
          if (!c.maskedPhone.includes("***")) {
            throw new Error(`Customer list returned unmasked phone number: ${c.maskedPhone}`);
          }
        });

        // Test overlong search query (101 chars) does not throw and caps safely
        const overlongQuery = "a".repeat(101);
        const overlongRes = await getCustomerList({ query: overlongQuery, limit: 20 }, tx);
        if (!overlongRes || typeof overlongRes.total !== "number") {
          throw new Error("Overlong search query failed to return valid paginated result");
        }

        console.log("[PASS] Bounded customer query, overlong query safety, and masked phone output verified");

        // 7. Test Mandatory expectedUpdatedAt for Archive & Restore
        // Test archive with invalid timestamp
        const invalidArchiveRes = await archiveCustomer(testAdminId, customer2.id, "invalid-date", tx);
        if (invalidArchiveRes.success || invalidArchiveRes.error !== CUSTOMER_ERRORS.INVALID_TIMESTAMP) {
          throw new Error("Archive with invalid timestamp was not rejected with INVALID_TIMESTAMP");
        }

        // Test archive with stale timestamp
        const staleArchiveRes = await archiveCustomer(testAdminId, customer2.id, new Date(Date.now() - 3600000).toISOString(), tx);
        if (staleArchiveRes.success || staleArchiveRes.error !== CUSTOMER_ERRORS.CONCURRENCY_CONFLICT) {
          throw new Error("Archive with stale timestamp was not rejected with CONCURRENCY_CONFLICT");
        }

        // Test valid archive
        const validArchiveRes = await archiveCustomer(testAdminId, customer2.id, customer2.updatedAt, tx);
        if (!validArchiveRes.success || !validArchiveRes.data.isArchived) {
          throw new Error("Archive customer failed");
        }

        // Verify archived customer is filterable
        const archivedList = await getCustomerList({ archiveFilter: "archived" }, tx);
        if (!archivedList.customers.some((c) => c.id === customer2.id)) {
          throw new Error("Archived customer was not found in archived filter list");
        }

        console.log("[PASS] Archive concurrency control and filter awareness verified");

        // Test restore with stale timestamp
        const staleRestoreRes = await restoreCustomer(testAdminId, customer2.id, customer2.updatedAt, tx); // old updatedAt before archive
        if (staleRestoreRes.success || staleRestoreRes.error !== CUSTOMER_ERRORS.CONCURRENCY_CONFLICT) {
          throw new Error("Restore with stale timestamp was not rejected with CONCURRENCY_CONFLICT");
        }

        // Test valid restore
        const validRestoreRes = await restoreCustomer(testAdminId, customer2.id, validArchiveRes.data.updatedAt, tx);
        if (!validRestoreRes.success || validRestoreRes.data.isArchived) {
          throw new Error("Restore customer failed");
        }

        console.log("[PASS] Restore concurrency control verified");

        // 8. Test Invalid UUID Handling
        const invalidIdRes = await getCustomerById("not-a-uuid", tx);
        if (invalidIdRes !== null) {
          throw new Error("getCustomerById returned non-null for invalid UUID string");
        }

        const invalidIdUpdate = await updateCustomer(testAdminId, "not-a-uuid", {
          fullName: "Invalid ID Test",
          phone: testPhone,
          roles: ["BUYER"],
          expectedUpdatedAt: new Date().toISOString(),
        }, tx);
        if (invalidIdUpdate.success || invalidIdUpdate.error !== CUSTOMER_ERRORS.NOT_FOUND) {
          throw new Error("updateCustomer did not return NOT_FOUND for invalid UUID");
        }

        console.log("[PASS] Invalid UUID input validation verified");

        // 9. Test Audit Event Logging & Redaction
        const auditLogs = await tx.auditLog.findMany({
          where: {
            entityType: "Customer",
            entityId: customer1.id,
          },
        });

        if (auditLogs.length === 0) {
          throw new Error("No audit logs found for Customer 1");
        }

        auditLogs.forEach((log) => {
          const logStr = JSON.stringify(log);
          if (
            logStr.includes("Sensitive internal test notes") ||
            logStr.includes(testPhone) ||
            logStr.includes("customer1@test.local")
          ) {
            throw new Error(`Audit log contains sensitive customer detail: ${logStr}`);
          }
        });

        console.log("[PASS] Audit log creation and privacy redaction verified");

        // 10. Test Unauthorized Access Protection
        const unauthCreate = await createCustomer("", {
          fullName: "Unauthorized Customer",
          phone: "01799998888",
          roles: ["BUYER"],
        }, tx);

        if (unauthCreate.success) {
          throw new Error("Unauthorized customer creation without admin ID succeeded");
        }

        console.log("[PASS] Service authorization enforcement verified");

        console.log("=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY ===");

        // Roll back transaction to clean up test records completely
        throw new Error("__TEST_ROLLBACK__");
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "__TEST_ROLLBACK__") {
      // Expected transaction rollback
      console.log("[PASS] Transaction rolled back cleanly — zero orphan test records remain.");
    } else {
      testFailed = true;
      process.exitCode = 1;
      console.error("\n[FAIL] Customer Integration Test Failed:", err instanceof Error ? err.message : err);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();

    if (!testFailed && process.exitCode !== 1) {
      console.log("\n[PASS] Customer Management Integration Test Suite PASSED CLEANLY!\n");
    } else {
      console.error(`\n[FAIL] Test suite failed with exitCode: ${process.exitCode}\n`);
      process.exit(1);
    }
  }
}

runCustomerIntegrationTests();
