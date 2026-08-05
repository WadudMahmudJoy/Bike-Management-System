import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  submitCustomerNid,
  markCustomerNidVerified,
  markCustomerNidNeedsCorrection,
  revealCustomerNid,
  createCustomerBankAccount,
  updateCustomerBankAccountMetadata,
  archiveCustomerBankAccount,
  restoreCustomerBankAccount,
  revealCustomerBankAccountNumber,
} from "../src/lib/sensitive-data/service";
import {
  recordRevealFailure,
  clearRevealThrottle,
  getGlobalRevealKeyHash,
} from "../src/lib/sensitive-data/reauth";
import { maskNid } from "../src/lib/sensitive-data/nid";
import { maskBankAccountNumber } from "../src/lib/sensitive-data/bank-account";
import { hashPassword } from "../src/lib/auth/password";

async function runSensitiveDataIntegrationTests() {
  console.log("=================================================");
  console.log("PHASE 3B1 SENSITIVE DATA INTEGRATION TEST SUITE");
  console.log("=================================================");

  // Set up environment keys for testing
  process.env.SENSITIVE_DATA_ACTIVE_KEY_VERSION = "1";
  process.env.SENSITIVE_DATA_ENCRYPTION_KEY_V1 = Buffer.alloc(32, "k").toString("base64");
  process.env.SENSITIVE_DATA_LOOKUP_HMAC_KEY = Buffer.alloc(32, "h").toString("base64");
  process.env.AUTH_RATE_LIMIT_SECRET = "s".repeat(32);

  const passwordHash = await hashPassword("AdminTestPass123!");

  const runId = Date.now().toString().slice(-6);
  const testEmail = `sensitiveadmin-${runId}@example.com`;

  // Create test admin user
  const admin = await prisma.adminUser.create({
    data: {
      email: testEmail,
      normalizedEmail: testEmail,
      passwordHash,
      name: "Sensitive Admin",
      role: "ADMIN",
      isActive: true,
    },
  });

  // Create test customer
  const customer = await prisma.customer.create({
    data: {
      customerCode: `CUS-S1-${runId}`,
      fullName: "Sensitive Test Customer 1",
      phone: `+880171${runId}01`,
      phoneNormalized: `+880171${runId}01`,
      createdByAdminId: admin.id,
      identity: {
        create: {
          nidStatus: "PENDING",
        },
      },
    },
    include: { identity: true },
  });

  // Create second test customer for duplicate tests
  const customer2 = await prisma.customer.create({
    data: {
      customerCode: `CUS-S2-${runId}`,
      fullName: "Sensitive Test Customer 2",
      phone: `+880171${runId}02`,
      phoneNormalized: `+880171${runId}02`,
      createdByAdminId: admin.id,
      identity: {
        create: {
          nidStatus: "PENDING",
        },
      },
    },
    include: { identity: true },
  });

  try {
    // -------------------------------------------------------------------------
    // 1. DATABASE INVARIANTS CHECK
    // -------------------------------------------------------------------------
    console.log("\n[1/7] Testing PostgreSQL Database Constraints...");

    // Test 1a: PENDING identity requires all sensitive fields NULL
    const pendingIdentity = await prisma.customerIdentity.findUnique({
      where: { customerId: customer.id },
    });
    if (
      pendingIdentity?.nidStatus !== "PENDING" ||
      pendingIdentity.encryptedNidNumber !== null ||
      pendingIdentity.encryptionIv !== null ||
      pendingIdentity.authTag !== null ||
      pendingIdentity.keyVersion !== null ||
      pendingIdentity.nidNumberHmac !== null ||
      pendingIdentity.lastFour !== null
    ) {
      throw new Error("FAILED: PENDING identity state does not have all sensitive fields NULL.");
    }
    console.log("  ✓ PENDING CustomerIdentity full-null invariant confirmed.");

    // Test 1b: Constraint rejection for invalid lastFour length (must be 4 ASCII digits)
    try {
      await prisma.$executeRaw`
        UPDATE "CustomerIdentity" SET "lastFour" = '123' WHERE "id" = ${pendingIdentity.id}::uuid;
      `;
      throw new Error("FAILED: Database accepted 3-digit lastFour in CustomerIdentity.");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("FAILED")) throw err;
      console.log("  ✓ Database rejected non-4-digit lastFour constraint.");
    }

    // -------------------------------------------------------------------------
    // 2. NID SUBMISSION & ENCRYPTION AT REST
    // -------------------------------------------------------------------------
    console.log("\n[2/7] Testing NID Submission & AES-256-GCM Encryption...");

    const nidVal = "19901234567890123";
    const subRes = await submitCustomerNid(admin.id, customer.id, nidVal);
    if (!subRes.success) {
      throw new Error(`FAILED: submitCustomerNid failed: ${subRes.error}`);
    }

    if (subRes.data.maskedNid !== maskNid(nidVal) || subRes.data.nidStatus !== "SUBMITTED") {
      throw new Error("FAILED: submitCustomerNid returned unexpected DTO values.");
    }
    console.log("  ✓ NID submitted successfully with masked return ******0123.");

    // Verify DB row contains AES-256-GCM ciphertext, IV, tag, 64-char hex HMAC, and lastFour
    const dbIdentity = await prisma.customerIdentity.findUnique({
      where: { customerId: customer.id },
    });
    if (
      !dbIdentity?.encryptedNidNumber ||
      !dbIdentity.encryptionIv ||
      !dbIdentity.authTag ||
      dbIdentity.keyVersion !== 1 ||
      dbIdentity.lastFour !== "0123" ||
      !dbIdentity.nidNumberHmac ||
      !/^[a-f0-9]{64}$/.test(dbIdentity.nidNumberHmac)
    ) {
      throw new Error("FAILED: Encrypted NID DB record is incomplete or corrupted.");
    }
    console.log("  ✓ DB encrypted record confirmed (64-char hex HMAC, fresh IV, tag, keyVersion 1).");

    // -------------------------------------------------------------------------
    // 3. DUPLICATE NID HARD-BLOCK ACROSS CUSTOMERS
    // -------------------------------------------------------------------------
    console.log("\n[3/7] Testing Duplicate NID Hard-Block...");

    const dupRes = await submitCustomerNid(admin.id, customer2.id, nidVal);
    if (dupRes.success || !dupRes.error.includes("already associated")) {
      throw new Error("FAILED: Duplicate NID was not blocked across customers.");
    }
    console.log("  ✓ Duplicate NID hard-blocked across customers.");

    // -------------------------------------------------------------------------
    // 4. NID LIFECYCLE STATE TRANSITIONS
    // -------------------------------------------------------------------------
    console.log("\n[4/7] Testing NID Lifecycle Status Transitions...");

    // Mark verified
    const vRes = await markCustomerNidVerified(
      admin.id,
      customer.id,
      subRes.data.updatedAt,
      "Verified via physical NID card"
    );
    if (!vRes.success || vRes.data.nidStatus !== "VERIFIED") {
      throw new Error("FAILED: Mark verified failed.");
    }
    console.log("  ✓ NID marked VERIFIED.");

    // Mark needs correction
    const cRes = await markCustomerNidNeedsCorrection(
      admin.id,
      customer.id,
      vRes.data.updatedAt,
      "Name mismatch"
    );
    if (!cRes.success || cRes.data.nidStatus !== "NEEDS_CORRECTION") {
      throw new Error("FAILED: Mark needs correction failed.");
    }
    console.log("  ✓ NID marked NEEDS_CORRECTION.");

    // -------------------------------------------------------------------------
    // 5. REAUTHENTICATED REVEAL & DUAL THROTTLE
    // -------------------------------------------------------------------------
    console.log("\n[5/7] Testing Re-authenticated Reveal & Throttling...");

    // Reveal with correct password
    const revRes = await revealCustomerNid(admin.id, customer.id, "AdminTestPass123!", "127.0.0.1");
    if (!revRes.success || revRes.data.plaintext !== nidVal) {
      throw new Error("FAILED: Valid reveal failed or returned wrong plaintext.");
    }
    console.log("  ✓ Re-authenticated NID reveal succeeded.");

    // Reveal with wrong password -> increments throttle
    for (let i = 0; i < 5; i++) {
      await recordRevealFailure(admin.id, `10.0.0.${i + 1}`);
    }

    const blockedRev = await revealCustomerNid(admin.id, customer.id, "AdminTestPass123!", "10.0.0.99");
    if (blockedRev.success || !blockedRev.error.includes("temporarily blocked")) {
      throw new Error("FAILED: Dual reveal throttle did not block after 5 failures.");
    }
    console.log("  ✓ Dual reveal throttle blocked request after 5 failed attempts.");

    // Clear throttle for remaining tests
    await clearRevealThrottle(admin.id, "127.0.0.1");

    // -------------------------------------------------------------------------
    // 6. CUSTOMER BANK ACCOUNTS LIFECYCLE
    // -------------------------------------------------------------------------
    console.log("\n[6/7] Testing Encrypted Customer Bank Accounts...");

    const bankNo = "123456789012";
    const createBankRes = await createCustomerBankAccount(admin.id, customer.id, {
      bankName: "Dutch-Bangla Bank",
      accountHolderName: "Sensitive Test Customer 1",
      branchName: "Mirpur Branch",
      accountNumber: bankNo,
    });

    if (!createBankRes.success || createBankRes.data.maskedAccountNumber !== maskBankAccountNumber(bankNo)) {
      throw new Error("FAILED: Create customer bank account failed.");
    }
    console.log("  ✓ Bank account created with masked account number ******9012.");

    // Verify DB row contains complete mandatory encryption bundle
    const dbBank = await prisma.customerBankAccount.findUnique({
      where: { id: createBankRes.data.id },
    });

    if (
      !dbBank ||
      !dbBank.encryptedAccountNumber ||
      !dbBank.encryptionIv ||
      !dbBank.authTag ||
      dbBank.keyVersion !== 1 ||
      dbBank.accountNumberLastFour !== "9012"
    ) {
      throw new Error("FAILED: Bank account DB record missing mandatory encryption bundle.");
    }
    console.log("  ✓ Bank account DB row contains full mandatory encryption bundle.");

    // Edit metadata without re-encrypting number
    const editBankRes = await updateCustomerBankAccountMetadata(admin.id, createBankRes.data.id, {
      bankName: "BRAC Bank",
      accountHolderName: "Sensitive Test Customer 1",
      branchName: "Gulshan Branch",
      expectedUpdatedAt: createBankRes.data.updatedAt,
    });

    if (!editBankRes.success || editBankRes.data.bankName !== "BRAC Bank") {
      throw new Error("FAILED: Update bank account metadata failed.");
    }
    console.log("  ✓ Bank account metadata updated without re-encrypting account number.");

    // Reveal bank account number
    const revealBankRes = await revealCustomerBankAccountNumber(
      admin.id,
      createBankRes.data.id,
      "AdminTestPass123!",
      "127.0.0.1"
    );

    if (!revealBankRes.success || revealBankRes.data.plaintext !== bankNo) {
      throw new Error("FAILED: Reveal bank account number failed.");
    }
    console.log("  ✓ Bank account number revealed successfully via re-authentication.");

    // Archive and restore bank account
    const archRes = await archiveCustomerBankAccount(admin.id, createBankRes.data.id, editBankRes.data.updatedAt);
    if (!archRes.success || archRes.data.isActive !== false) {
      throw new Error("FAILED: Archive bank account failed.");
    }
    console.log("  ✓ Bank account archived.");

    const restRes = await restoreCustomerBankAccount(admin.id, createBankRes.data.id, archRes.data.updatedAt);
    if (!restRes.success || restRes.data.isActive !== true) {
      throw new Error("FAILED: Restore bank account failed.");
    }
    console.log("  ✓ Bank account restored.");

    // -------------------------------------------------------------------------
    // 7. PRIVACY AUDIT REDACTION SCANNER
    // -------------------------------------------------------------------------
    console.log("\n[7/7] Scanning Audit Logs for Sensitive Data Leaks...");

    const auditLogs = await prisma.auditLog.findMany({
      where: { adminUserId: admin.id },
    });

    for (const log of auditLogs) {
      const jsonStr = JSON.stringify({
        prev: log.previousValue,
        next: log.newValue,
      });

      if (
        jsonStr.includes(nidVal) ||
        jsonStr.includes(bankNo) ||
        jsonStr.includes("encryptedNidNumber") ||
        jsonStr.includes("encryptedAccountNumber") ||
        jsonStr.includes("encryptionIv") ||
        jsonStr.includes("authTag") ||
        jsonStr.includes("nidNumberHmac") ||
        jsonStr.includes("lastFour") ||
        jsonStr.includes("accountNumberLastFour")
      ) {
        throw new Error(`FAILED: Sensitive leak detected in AuditLog ID ${log.id}!`);
      }
    }
    console.log(`  ✓ Scanned ${auditLogs.length} AuditLog entries: ZERO sensitive data leaks detected!`);

    console.log("\n=================================================");
    console.log("ALL PHASE 3B1 INTEGRATION TESTS PASSED CLEANLY!");
    console.log("=================================================\n");
  } finally {
    // Cleanup test data
    await prisma.customerBankAccount.deleteMany({ where: { customerId: { in: [customer.id, customer2.id] } } });
    await prisma.customerIdentity.deleteMany({ where: { customerId: { in: [customer.id, customer2.id] } } });
    await prisma.customer.deleteMany({ where: { id: { in: [customer.id, customer2.id] } } });
    await prisma.adminLoginThrottle.deleteMany({ where: { keyHash: { in: [getGlobalRevealKeyHash(admin.id)] } } });
  }
}

runSensitiveDataIntegrationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
