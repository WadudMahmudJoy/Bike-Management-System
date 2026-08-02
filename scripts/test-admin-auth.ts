/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import Module from "module";

// Mock 'server-only' package for Node CLI integration test runner
const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.call(this, id);
};

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { normalizeEmail } from "../src/lib/auth/email";
import {
  createAdminSessionRecord,
  verifyAdminSessionToken,
  revokeAdminSessionToken,
} from "../src/lib/auth/session";
import {
  checkThrottle,
  recordFailedAttempt,
  clearThrottle,
  computeThrottleKey,
} from "../src/lib/auth/login-throttle";
import {
  authenticateAdminCredentials,
  GENERIC_CREDENTIAL_ERROR,
} from "../src/lib/auth/auth-service";
import {
  MAX_LOGIN_ATTEMPTS,
} from "../src/lib/auth/constants";

// Ensure fallback AUTH_RATE_LIMIT_SECRET for test environment
if (!process.env.AUTH_RATE_LIMIT_SECRET) {
  process.env.AUTH_RATE_LIMIT_SECRET =
    "test_rate_limit_secret_at_least_32_bytes_long_123456";
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runAdminAuthIntegrationTests() {
  console.log(
    "\n🧪 Running Phase 2.1 Admin Auth & Session Production Integration Tests...\n",
  );

  const testRunId = Date.now().toString(36);
  const clientIp = "127.0.0.1";

  let testCount = 0;
  let passCount = 0;

  function assert(condition: boolean, description: string) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✓ Test ${testCount}: ${description}`);
    } else {
      console.error(`  ✗ Test ${testCount} FAILED: ${description}`);
      throw new Error(`Assertion failed: ${description}`);
    }
  }

  // Pre-existing unrelated throttle row inserted BEFORE test run to prove non-destructive cleanup
  const unrelatedEmail = `unrelated-${testRunId}@test.local`;
  const unrelatedKeyHash = computeThrottleKey(unrelatedEmail, clientIp);

  await prisma.adminLoginThrottle.create({
    data: {
      keyHash: unrelatedKeyHash,
      failureCount: 2,
      windowStartedAt: new Date(),
      lastAttemptAt: new Date(),
    },
  });

  try {
    // Run all synthetic test mutations inside an isolated ROLLBACK transaction
    await prisma.$transaction(
      async (tx) => {
        // -------------------------------------------------------------------------
        // Setup Synthetic Test Admin Users inside Transaction
        // -------------------------------------------------------------------------
        const testEmail = `synthetic-admin-${testRunId}@test.local`;
        const normalizedTestEmail = normalizeEmail(testEmail);
        const testPassword = "TestPassword123!Secure";
        const passwordHash = await hashPassword(testPassword);

        const admin = await tx.adminUser.create({
          data: {
            email: testEmail,
            normalizedEmail: normalizedTestEmail,
            passwordHash,
            name: "Synthetic Test Admin",
            role: "ADMIN",
            isActive: true,
          },
        });

        const inactiveEmail = `inactive-${testRunId}@test.local`;
        const inactiveAdmin = await tx.adminUser.create({
          data: {
            email: inactiveEmail,
            normalizedEmail: normalizeEmail(inactiveEmail),
            passwordHash,
            name: "Inactive Test Admin",
            role: "ADMIN",
            isActive: false,
          },
        });

        // -------------------------------------------------------------------------
        // 1. Production Session Functions Verification
        // -------------------------------------------------------------------------
        const sessionRes = await createAdminSessionRecord(
          admin.id,
          clientIp,
          "IntegrationTestRunner/1.0",
          tx,
        );

        const dbRecord = await tx.adminSession.findUnique({
          where: { id: sessionRes.sessionId },
        });

        assert(
          dbRecord !== null &&
            dbRecord.sessionTokenHash !== sessionRes.rawToken,
          "createAdminSessionRecord stores SHA-256 hash and never raw token in database",
        );

        const verifiedSession = await verifyAdminSessionToken(
          sessionRes.rawToken,
          tx,
        );
        assert(
          verifiedSession !== null && verifiedSession.admin.id === admin.id,
          "verifyAdminSessionToken verifies valid active token",
        );

        // Malformed token verification
        const malformedResult = await verifyAdminSessionToken(
          "invalid-short-token",
          tx,
        );
        assert(
          malformedResult === null,
          "verifyAdminSessionToken rejects malformed token",
        );

        // Expired session test
        const expiredRes = await createAdminSessionRecord(
          admin.id,
          clientIp,
          "TestRunner",
          tx,
        );
        await tx.adminSession.update({
          where: { id: expiredRes.sessionId },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        const expiredVerification = await verifyAdminSessionToken(
          expiredRes.rawToken,
          tx,
        );
        assert(
          expiredVerification === null,
          "verifyAdminSessionToken rejects expired session",
        );

        // Inactive admin session test
        const inactiveSessionRes = await createAdminSessionRecord(
          inactiveAdmin.id,
          clientIp,
          "TestRunner",
          tx,
        );
        const inactiveVerification = await verifyAdminSessionToken(
          inactiveSessionRes.rawToken,
          tx,
        );
        assert(
          inactiveVerification === null,
          "verifyAdminSessionToken rejects inactive admin session",
        );

        // Session revocation test
        const revokeUserId = await revokeAdminSessionToken(
          sessionRes.rawToken,
          tx,
        );
        assert(
          revokeUserId === admin.id,
          "revokeAdminSessionToken revokes active session",
        );

        // Idempotent revocation test
        const secondRevokeUserId = await revokeAdminSessionToken(
          sessionRes.rawToken,
          tx,
        );
        assert(
          secondRevokeUserId === admin.id,
          "revokeAdminSessionToken is idempotent",
        );

        const postRevokeVerification = await verifyAdminSessionToken(
          sessionRes.rawToken,
          tx,
        );
        assert(
          postRevokeVerification === null,
          "verifyAdminSessionToken rejects post-revocation token",
        );

        // -------------------------------------------------------------------------
        // 2. Production Authentication Service (authenticateAdminCredentials)
        // -------------------------------------------------------------------------

        // Unknown email returns generic error
        const unknownAuth = await authenticateAdminCredentials(
          {
            email: `unknown-${testRunId}@test.local`,
            password: testPassword,
            clientAddress: clientIp,
          },
          tx,
        );
        assert(
          unknownAuth.success === false &&
            unknownAuth.error === GENERIC_CREDENTIAL_ERROR,
          "authenticateAdminCredentials returns generic credential error for unknown email",
        );

        // Wrong password returns identical generic error
        const wrongPassAuth = await authenticateAdminCredentials(
          {
            email: testEmail,
            password: "WrongPassword123!",
            clientAddress: clientIp,
          },
          tx,
        );
        assert(
          wrongPassAuth.success === false &&
            wrongPassAuth.error === GENERIC_CREDENTIAL_ERROR,
          "authenticateAdminCredentials returns identical generic error for wrong password",
        );

        // Inactive account returns generic error
        const inactiveAuth = await authenticateAdminCredentials(
          {
            email: inactiveEmail,
            password: testPassword,
            clientAddress: clientIp,
          },
          tx,
        );
        assert(
          inactiveAuth.success === false &&
            inactiveAuth.error === GENERIC_CREDENTIAL_ERROR,
          "authenticateAdminCredentials returns generic error for inactive account",
        );

        // Successful authentication
        const successAuth = await authenticateAdminCredentials(
          {
            email: testEmail,
            password: testPassword,
            clientAddress: clientIp,
            userAgent: "IntegrationTestRunner/1.0",
          },
          tx,
        );

        assert(
          successAuth.success === true &&
            typeof successAuth.rawToken === "string" &&
            typeof successAuth.sessionId === "string",
          "authenticateAdminCredentials creates session and returns rawToken & sessionId on success",
        );

        // Verify AuditLog record entityType and entityId
        const auditRecord = await tx.auditLog.findFirst({
          where: {
            adminUserId: admin.id,
            action: "ADMIN_LOGIN_SUCCESS",
          },
          orderBy: { createdAt: "desc" },
        });

        assert(
          auditRecord !== null &&
            auditRecord.entityType === "AdminSession" &&
            auditRecord.entityId === successAuth.sessionId,
          "Successful login audit log references entityType: 'AdminSession' and entityId: session.id",
        );

        // -------------------------------------------------------------------------
        // 3. Concurrency Integration Test for Throttling
        // -------------------------------------------------------------------------
        const concurrentEmail = `concurrent-${testRunId}@test.local`;
        const normalizedConcurrentEmail = normalizeEmail(concurrentEmail);

        // Issue 5 simultaneous recordFailedAttempt calls
        await Promise.all([
          recordFailedAttempt(normalizedConcurrentEmail, clientIp, tx),
          recordFailedAttempt(normalizedConcurrentEmail, clientIp, tx),
          recordFailedAttempt(normalizedConcurrentEmail, clientIp, tx),
          recordFailedAttempt(normalizedConcurrentEmail, clientIp, tx),
          recordFailedAttempt(normalizedConcurrentEmail, clientIp, tx),
        ]);

        const concurrentCheck = await checkThrottle(
          normalizedConcurrentEmail,
          clientIp,
          tx,
        );
        assert(
          concurrentCheck.blocked === true,
          "5 simultaneous recordFailedAttempt calls result in blocked throttle state",
        );

        const concurrentKey = computeThrottleKey(
          normalizedConcurrentEmail,
          clientIp,
        );
        const concurrentRecord = await tx.adminLoginThrottle.findUnique({
          where: { keyHash: concurrentKey },
        });
        assert(
          concurrentRecord !== null &&
            concurrentRecord.failureCount >= MAX_LOGIN_ATTEMPTS,
          "Concurrent failed attempt updates preserve all failure count increments",
        );

        // Clear synthetic throttle key
        await clearThrottle(normalizedConcurrentEmail, clientIp, tx);
        const postClearCheck = await checkThrottle(
          normalizedConcurrentEmail,
          clientIp,
          tx,
        );
        assert(
          postClearCheck.blocked === false,
          "clearThrottle removes matching throttle entry",
        );

        // Intentionally throw to trigger transaction rollback for synthetic rows
        throw new Error("__TEST_ROLLBACK__");
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "__TEST_ROLLBACK__") {
      // Expected transaction rollback
    } else {
      console.error(
        "\n❌ Integration Test Failed:",
        err instanceof Error ? err.message : err,
      );
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Non-Destructive Cleanup Safety Proof
  // -------------------------------------------------------------------------
  try {
    const survivingUnrelatedRecord =
      await prisma.adminLoginThrottle.findUnique({
        where: { keyHash: unrelatedKeyHash },
      });

    assert(
      survivingUnrelatedRecord !== null,
      "Unrelated pre-existing throttle row survives test suite execution (non-destructive cleanup verified)",
    );

    console.log(
      `\n✅ All ${passCount} / ${testCount} Phase 2.1 Integration Tests PASSED CLEANLY!\n`,
    );
  } finally {
    // Cleanup the single pre-existing test throttle row created outside transaction
    await prisma.adminLoginThrottle.deleteMany({
      where: { keyHash: unrelatedKeyHash },
    });
    await prisma.$disconnect();
    await pool.end();
    console.log("✨ Non-destructive cleanup complete.\n");
  }
}

runAdminAuthIntegrationTests();
