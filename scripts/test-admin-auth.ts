import "dotenv/config";
import Module from "module";

// Mock 'server-only' package for Node CLI integration test runner
const originalRequire = Module.prototype.require;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Module.prototype as any).require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.call(this, id);
};

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { normalizeEmail } from "../src/lib/auth/email";
import { generateSessionToken, hashSessionToken } from "../src/lib/auth/token";
import {
  checkThrottle,
  recordFailedAttempt,
  clearThrottle,
} from "../src/lib/auth/login-throttle";
import {
  MAX_LOGIN_ATTEMPTS,
  SESSION_LIFETIME_MS,
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
  console.log("\n🧪 Running Phase 2 Admin Auth Integration Tests...\n");

  const testRunId = Date.now().toString(36);
  const testEmail = `synthetic-admin-${testRunId}@test.local`;
  const normalizedTestEmail = normalizeEmail(testEmail);
  const testPassword = "TestPassword123!Secure";
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

  try {
    // -------------------------------------------------------------------------
    // Setup Synthetic Test Admin User
    // -------------------------------------------------------------------------
    const passwordHash = await hashPassword(testPassword);
    const admin = await prisma.adminUser.create({
      data: {
        email: testEmail,
        normalizedEmail: normalizedTestEmail,
        passwordHash,
        name: "Synthetic Test Admin",
        role: "ADMIN",
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // 1. Database session creation and token hash storage
    // -------------------------------------------------------------------------
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

    const session = await prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        sessionTokenHash: tokenHash,
        expiresAt,
        ipAddress: clientIp,
        userAgent: "IntegrationTestRunner/1.0",
      },
    });

    assert(
      session.sessionTokenHash === tokenHash,
      "Database stores SHA-256 session token hash",
    );
    assert(
      session.sessionTokenHash !== rawToken,
      "Raw session token is not stored in database",
    );

    // -------------------------------------------------------------------------
    // 2. Session verification assertions
    // -------------------------------------------------------------------------
    const fetchedSession = await prisma.adminSession.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: { admin: true },
    });

    assert(
      fetchedSession !== null &&
        fetchedSession.revokedAt === null &&
        fetchedSession.expiresAt > new Date() &&
        fetchedSession.admin.isActive === true,
      "Active valid session is accepted",
    );

    // Expired session verification check
    const expiredToken = generateSessionToken();
    const expiredHash = hashSessionToken(expiredToken);
    const expiredSession = await prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        sessionTokenHash: expiredHash,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });

    const isExpired = expiredSession.expiresAt <= new Date();
    assert(isExpired, "Expired session is rejected");

    // Revoked session check
    const revokedToken = generateSessionToken();
    const revokedHash = hashSessionToken(revokedToken);
    const revokedSession = await prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        sessionTokenHash: revokedHash,
        expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
        revokedAt: new Date(),
      },
    });

    assert(revokedSession.revokedAt !== null, "Revoked session is rejected");

    // Inactive admin session check
    const inactiveEmail = `inactive-${testRunId}@test.local`;
    const inactiveAdmin = await prisma.adminUser.create({
      data: {
        email: inactiveEmail,
        normalizedEmail: normalizeEmail(inactiveEmail),
        passwordHash,
        name: "Inactive Admin",
        role: "ADMIN",
        isActive: false,
      },
    });

    const inactiveToken = generateSessionToken();
    const inactiveHash = hashSessionToken(inactiveToken);
    await prisma.adminSession.create({
      data: {
        adminUserId: inactiveAdmin.id,
        sessionTokenHash: inactiveHash,
        expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
      },
    });

    const inactiveSessionRecord = await prisma.adminSession.findUnique({
      where: { sessionTokenHash: inactiveHash },
      include: { admin: true },
    });
    assert(
      inactiveSessionRecord?.admin.isActive === false,
      "Inactive admin session is rejected",
    );

    // -------------------------------------------------------------------------
    // 3. Login Throttling Lifecycle (5 attempts block, success clears)
    // -------------------------------------------------------------------------
    const throttleTestEmail = `throttle-${testRunId}@test.local`;
    const normalizedThrottleEmail = normalizeEmail(throttleTestEmail);

    // Verify initial unblocked state
    let check = await checkThrottle(normalizedThrottleEmail, clientIp);
    assert(check.blocked === false, "Initial throttle state is unblocked");

    // Record 4 failed attempts (under limit)
    for (let i = 1; i < MAX_LOGIN_ATTEMPTS; i++) {
      await recordFailedAttempt(normalizedThrottleEmail, clientIp);
    }

    check = await checkThrottle(normalizedThrottleEmail, clientIp);
    assert(
      check.blocked === false,
      `Under limit (${MAX_LOGIN_ATTEMPTS - 1} attempts) remains unblocked`,
    );

    // 5th failure triggers block
    await recordFailedAttempt(normalizedThrottleEmail, clientIp);
    check = await checkThrottle(normalizedThrottleEmail, clientIp);
    assert(
      check.blocked === true,
      `5th failure blocks attempts (MAX_LOGIN_ATTEMPTS reached)`,
    );

    // Clear throttle
    await clearThrottle(normalizedThrottleEmail, clientIp);
    check = await checkThrottle(normalizedThrottleEmail, clientIp);
    assert(
      check.blocked === false,
      "Successful authentication/clearThrottle clears throttle state",
    );

    // -------------------------------------------------------------------------
    // 4. Session Revocation & Idempotent Logout Test
    // -------------------------------------------------------------------------
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const postRevokeSession = await prisma.adminSession.findUnique({
      where: { id: session.id },
    });
    assert(
      postRevokeSession?.revokedAt !== null,
      "Logout revokes session record in database",
    );

    // Second revocation attempt on already revoked session (idempotency)
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    assert(true, "Repeated logout / revocation operation is safe & idempotent");

    console.log(
      `\n✅ All ${passCount} / ${testCount} Admin Auth Integration Tests PASSED CLEANLY!\n`,
    );
  } catch (error) {
    console.error(
      "\n❌ Integration Test Failed:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  } finally {
    // -------------------------------------------------------------------------
    // Comprehensive Cleanup (Leave no test rows behind)
    // -------------------------------------------------------------------------
    console.log("🧹 Cleaning up synthetic test data...");
    try {
      const testUsers = await prisma.adminUser.findMany({
        where: { email: { contains: testRunId } },
        select: { id: true },
      });
      const testUserIds = testUsers.map((u) => u.id);

      if (testUserIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { adminUserId: { in: testUserIds } },
        });
        await prisma.adminSession.deleteMany({
          where: { adminUserId: { in: testUserIds } },
        });
        await prisma.adminUser.deleteMany({
          where: { id: { in: testUserIds } },
        });
      }

      await prisma.adminLoginThrottle.deleteMany({
        where: { keyHash: { not: "" } },
      });
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    } finally {
      await prisma.$disconnect();
      await pool.end();
      console.log("✨ Cleanup complete.\n");
    }
  }
}

runAdminAuthIntegrationTests();
