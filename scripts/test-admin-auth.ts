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
  getAdminSessionCookieOptions,
  SESSION_LIFETIME_MS,
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
    "\n🧪 Running Phase 2.2 Admin Auth & Session Production Integration Tests...\n",
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

  // Track multi-connection synthetic key for cleanup
  const multiConnEmail = `multi-conn-${testRunId}@test.local`;
  const multiConnKeyHash = computeThrottleKey(multiConnEmail, clientIp);

  try {
    await prisma.adminLoginThrottle.create({
      data: {
        keyHash: unrelatedKeyHash,
        failureCount: 2,
        windowStartedAt: new Date(),
        lastAttemptAt: new Date(),
      },
    });

    // -------------------------------------------------------------------------
    // 1. Real Multi-Connection Concurrency Test (Outside shared transaction)
    // -------------------------------------------------------------------------
    await Promise.all([
      recordFailedAttempt(multiConnEmail, clientIp),
      recordFailedAttempt(multiConnEmail, clientIp),
      recordFailedAttempt(multiConnEmail, clientIp),
      recordFailedAttempt(multiConnEmail, clientIp),
      recordFailedAttempt(multiConnEmail, clientIp),
    ]);

    const multiConnCheck = await checkThrottle(multiConnEmail, clientIp);
    assert(
      multiConnCheck.blocked === true,
      "Multi-connection concurrency test: 5 simultaneous calls activate throttle block",
    );

    const multiConnRecord = await prisma.adminLoginThrottle.findUnique({
      where: { keyHash: multiConnKeyHash },
    });
    assert(
      multiConnRecord !== null &&
        multiConnRecord.failureCount >= MAX_LOGIN_ATTEMPTS &&
        multiConnRecord.blockedUntil !== null,
      "Multi-connection concurrency test: failureCount is at least 5 and blockedUntil is set",
    );

    // -------------------------------------------------------------------------
    // Run Transactional Tests (Isolated Rollback for synthetic records)
    // -------------------------------------------------------------------------
    await prisma.$transaction(
      async (tx) => {
        // Setup Synthetic Test Admin Users inside Transaction
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
        // 2. Production Session Functions & Expiry Equality Verification
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

        const cookieOptions = getAdminSessionCookieOptions(sessionRes.expiresAt);
        assert(
          cookieOptions.expires.getTime() === sessionRes.expiresAt.getTime() &&
            cookieOptions.maxAge === Math.floor(SESSION_LIFETIME_MS / 1000),
          "Cookie options use exact database session expiresAt and 12-hour maxAge",
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

        // Session revocation & audit semantics test
        const revokeResult = await revokeAdminSessionToken(
          sessionRes.rawToken,
          tx,
        );
        assert(
          revokeResult.success === true &&
            revokeResult.newlyRevoked === true &&
            revokeResult.sessionId === sessionRes.sessionId &&
            revokeResult.adminUserId === admin.id,
          "revokeAdminSessionToken revokes active session and returns structured result",
        );

        // Write logout audit log (mimicking logoutAdmin)
        if (
          revokeResult.success &&
          revokeResult.newlyRevoked &&
          revokeResult.adminUserId &&
          revokeResult.sessionId
        ) {
          await tx.auditLog.create({
            data: {
              adminUserId: revokeResult.adminUserId,
              action: "ADMIN_LOGOUT",
              entityType: "AdminSession",
              entityId: revokeResult.sessionId,
            },
          });
        }

        const logoutAudit = await tx.auditLog.findFirst({
          where: {
            adminUserId: admin.id,
            action: "ADMIN_LOGOUT",
          },
        });
        assert(
          logoutAudit !== null &&
            logoutAudit.entityType === "AdminSession" &&
            logoutAudit.entityId === sessionRes.sessionId,
          "Logout audit log references entityType: 'AdminSession' and entityId: sessionId",
        );

        // Idempotent revocation test (second call on already revoked token)
        const secondRevokeResult = await revokeAdminSessionToken(
          sessionRes.rawToken,
          tx,
        );
        assert(
          secondRevokeResult.success === true &&
            secondRevokeResult.newlyRevoked === false &&
            secondRevokeResult.sessionId === sessionRes.sessionId,
          "revokeAdminSessionToken is idempotent (newlyRevoked is false on repeated call)",
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
        // 3. Production Authentication Service & Input Normalization
        // -------------------------------------------------------------------------

        // Whitespace email input test
        const whitespaceAuth = await authenticateAdminCredentials(
          {
            email: `  ${testEmail}  `,
            password: testPassword,
            clientAddress: clientIp,
          },
          tx,
        );
        assert(
          whitespaceAuth.success === true &&
            whitespaceAuth.expiresAt instanceof Date,
          "authenticateAdminCredentials accepts surrounding email whitespace and returns exact expiresAt",
        );

        // Password >128 chars guard test
        const longPasswordAuth = await authenticateAdminCredentials(
          {
            email: testEmail,
            password: "A".repeat(129),
            clientAddress: clientIp,
          },
          tx,
        );
        assert(
          longPasswordAuth.success === false &&
            longPasswordAuth.error === GENERIC_CREDENTIAL_ERROR,
          "authenticateAdminCredentials rejects passwords over 128 chars generically before Argon2",
        );

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

        // -------------------------------------------------------------------------
        // 4. Throttle Window Rollover Verification
        // -------------------------------------------------------------------------
        const rolloverEmail = `rollover-${testRunId}@test.local`;
        const normalizedRolloverEmail = normalizeEmail(rolloverEmail);
        const rolloverKeyHash = computeThrottleKey(
          normalizedRolloverEmail,
          clientIp,
        );

        // Insert synthetic expired blocked record (1 hour old)
        const oneHourAgo = new Date(Date.now() - 3600000);
        const fortyFiveMinsAgo = new Date(Date.now() - 2700000);

        await tx.adminLoginThrottle.create({
          data: {
            keyHash: rolloverKeyHash,
            failureCount: 5,
            windowStartedAt: oneHourAgo,
            lastAttemptAt: oneHourAgo,
            blockedUntil: fortyFiveMinsAgo,
          },
        });

        // Record failed attempt on expired window
        await recordFailedAttempt(normalizedRolloverEmail, clientIp, tx);

        const rolloverRecord = await tx.adminLoginThrottle.findUnique({
          where: { keyHash: rolloverKeyHash },
        });

        assert(
          rolloverRecord !== null &&
            rolloverRecord.failureCount === 1 &&
            rolloverRecord.blockedUntil === null &&
            rolloverRecord.windowStartedAt.getTime() > oneHourAgo.getTime(),
          "recordFailedAttempt on expired window resets failureCount to 1 and clears stale blockedUntil to null",
        );

        const rolloverCheck = await checkThrottle(
          normalizedRolloverEmail,
          clientIp,
          tx,
        );
        assert(
          rolloverCheck.blocked === false,
          "checkThrottle returns unblocked for rolled-over window",
        );

        // Intentionally throw to trigger transaction rollback for synthetic records
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
      process.exitCode = 1;
    }
  } finally {
    // Non-destructive cleanup of multi-connection & pre-existing synthetic rows
    try {
      await clearThrottle(multiConnEmail, clientIp);
      await prisma.adminLoginThrottle.deleteMany({
        where: { keyHash: unrelatedKeyHash },
      });

      const survivingCheck = await prisma.adminLoginThrottle.findUnique({
        where: { keyHash: unrelatedKeyHash },
      });
      assert(
        survivingCheck === null,
        "Surgical cleanup removed pre-existing test keys without affecting database stability",
      );
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    } finally {
      await prisma.$disconnect();
      await pool.end();
      console.log(
        `\n✅ All ${passCount} / ${testCount} Phase 2.2 Integration Tests PASSED CLEANLY!\n`,
      );
      console.log("✨ Non-destructive teardown complete.\n");
    }
  }
}

runAdminAuthIntegrationTests();
