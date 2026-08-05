import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import {
  createCustomer,
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
} from "../src/lib/customer/service";
import { getCustomerList } from "../src/lib/customer/queries";
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
  console.log("=== Phase 3A: Customer Management Integration Test Suite ===");

  let testFailed = false;

  try {
    // Run all tests inside a transaction that is rolled back at the end
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

        // 3. Test Customer Creation using production service within tx
        const createResult = await createCustomer(testAdminId, {
          fullName: "Test Customer One",
          fatherName: "Test Father One",
          phone: testPhone,
          whatsappNumber: "01811112233",
          email: "customer1@test.local",
          address: "123 Test Street, Dhaka",
          emergencyContact: "Emergency: 01511112233",
          internalNotes: "Sensitive internal test notes",
          roles: ["BUYER", "SELLER"],
        }, tx);

        if (!createResult.success) {
          throw new Error(`Customer 1 creation failed: ${createResult.error}`);
        }

        const customer1 = createResult.data;
        console.log(`[PASS] Created Customer 1: ${customer1.customerCode} (${customer1.id})`);

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

        console.log("[PASS] Customer 1 Code, PENDING identity status, and zero bank accounts verified");

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

        // Confirm duplicate creation
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

        const customer2 = dupConfirmResult.data;
        if (customer1.id === customer2.id || customer1.customerCode === customer2.customerCode) {
          throw new Error("Shared phone records failed to produce distinct customer entities");
        }

        console.log(`[PASS] Created Customer 2 with shared family phone: ${customer2.customerCode}`);

        // 5. Test Customer Update & Optimistic Concurrency Protection
        const updateResult = await updateCustomer(testAdminId, customer1.id, {
          fullName: "Test Customer One Updated",
          phone: testPhone,
          roles: ["BUYER", "POTENTIAL_SELLER"],
          expectedUpdatedAt: customer1.updatedAt,
          confirmDuplicate: true,
          expectedDuplicateCustomerIds: [customer2.id],
        }, tx);

        if (!updateResult.success) {
          throw new Error(`Customer update failed: ${updateResult.error}`);
        }

        const updatedCustomer1 = updateResult.data;
        if (updatedCustomer1.fullName !== "Test Customer One Updated") {
          throw new Error("Customer name was not updated correctly");
        }
        if (!updatedCustomer1.roles.includes("POTENTIAL_SELLER") || updatedCustomer1.roles.includes("SELLER")) {
          throw new Error("Customer roles were not replaced correctly");
        }

        console.log("[PASS] Customer update and role synchronization verified");

        // Test Stale Update Rejection (Concurrency Conflict)
        const staleUpdateResult = await updateCustomer(testAdminId, customer1.id, {
          fullName: "Stale Update Attempt",
          phone: testPhone,
          roles: ["BUYER"],
          expectedUpdatedAt: customer1.updatedAt, // Old updatedAt before previous update
          confirmDuplicate: true,
          expectedDuplicateCustomerIds: [customer2.id],
        }, tx);

        if (staleUpdateResult.success || !staleUpdateResult.error.includes("CONCURRENCY_CONFLICT")) {
          throw new Error("Stale update attempt was not rejected with CONCURRENCY_CONFLICT error");
        }

        console.log("[PASS] Optimistic concurrency conflict rejection verified");

        // 6. Test Bounded Search & Querying
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

        console.log("[PASS] Bounded customer query and masked phone output verified");

        // 7. Test Customer Archive & Restore
        const archiveRes = await archiveCustomer(testAdminId, customer2.id, customer2.updatedAt, tx);
        if (!archiveRes.success || !archiveRes.data.isArchived) {
          throw new Error("Archive customer failed");
        }

        // Verify archived customer is filterable
        const archivedList = await getCustomerList({ archiveFilter: "archived" }, tx);
        if (!archivedList.customers.some((c) => c.id === customer2.id)) {
          throw new Error("Archived customer was not found in archived filter list");
        }

        console.log("[PASS] Archive operation and archived duplicate awareness verified");

        // Restore customer
        const restoreRes = await restoreCustomer(testAdminId, customer2.id, archiveRes.data.updatedAt, tx);
        if (!restoreRes.success || restoreRes.data.isArchived) {
          throw new Error("Restore customer failed");
        }

        console.log("[PASS] Customer restore operation verified");

        // 8. Test Audit Event Logging & Redaction
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

        // 9. Test Unauthorized Access Protection
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
      console.error("\n❌ Customer Integration Test Failed:", err instanceof Error ? err.message : err);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();

    if (!testFailed && process.exitCode !== 1) {
      console.log("\n✅ Customer Management Integration Test Suite PASSED CLEANLY!\n");
    } else {
      console.error(`\n❌ Test suite failed with exitCode: ${process.exitCode}\n`);
      process.exit(1);
    }
  }
}

runCustomerIntegrationTests();
