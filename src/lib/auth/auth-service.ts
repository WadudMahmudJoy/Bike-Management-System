import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { validateAndNormalizeEmail } from "./email";
import { verifyPassword, verifyAgainstDummy } from "./password";
import {
  checkThrottle,
  recordFailedAttempt,
  clearThrottle,
} from "./login-throttle";
import { createAdminSessionRecord } from "./session";
import type { AdminSessionDTO } from "./types";

export interface AuthenticateCredentialsParams {
  email: string;
  password: string;
  clientAddress: string;
  userAgent?: string | null;
}

export interface AuthenticateCredentialsResult {
  success: boolean;
  error?: string;
  rawToken?: string;
  sessionId?: string;
  admin?: AdminSessionDTO;
}

export const GENERIC_CREDENTIAL_ERROR = "Invalid email or password.";
export const THROTTLE_BLOCKED_ERROR =
  "Too many sign-in attempts. Please try again later.";

/**
 * Server-side Credential Verification & Authentication Service.
 *
 * Handles:
 * - Email normalization
 * - Pre-auth rate-limit throttle check
 * - Constant-work anti-enumeration dummy verification for unknown emails
 * - Real Argon2id password verification
 * - Inactive account rejection
 * - Failed attempt recording
 * - Atomic database transaction for successful login:
 *   - Updates lastLoginAt
 *   - Creates AdminSession record storing ONLY token hash
 *   - Creates ADMIN_LOGIN_SUCCESS AuditLog (entityType: AdminSession, entityId: session.id)
 *   - Clears throttle entry
 * - Returns rawToken to Server Action (NEVER exposed to Client Component)
 */
export async function authenticateAdminCredentials(
  params: AuthenticateCredentialsParams,
  txPrisma?: Prisma.TransactionClient,
): Promise<AuthenticateCredentialsResult> {
  const { email, password, clientAddress, userAgent = null } = params;

  // 1. Email normalization & validation
  const normalized = validateAndNormalizeEmail(email);
  if (!normalized) {
    return { success: false, error: GENERIC_CREDENTIAL_ERROR };
  }

  // 2. Pre-auth throttle check
  const throttleCheck = await checkThrottle(
    normalized,
    clientAddress,
    txPrisma,
  );
  if (throttleCheck.blocked) {
    return { success: false, error: THROTTLE_BLOCKED_ERROR };
  }

  const client = txPrisma ?? prisma;

  // 3. Admin lookup
  const admin = await client.adminUser.findUnique({
    where: { normalizedEmail: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      isActive: true,
    },
  });

  // 4. Password verification (constant-work for non-existent accounts)
  let isValidPassword = false;
  if (!admin) {
    await verifyAgainstDummy(password);
  } else {
    isValidPassword = await verifyPassword(admin.passwordHash, password);
  }

  // 5. Check credentials and account active status
  if (!admin || !isValidPassword || !admin.isActive) {
    await recordFailedAttempt(normalized, clientAddress, txPrisma);
    return { success: false, error: GENERIC_CREDENTIAL_ERROR };
  }

  // 6. Success: atomic database transaction
  const executeLoginTx = async (tx: Prisma.TransactionClient) => {
    const now = new Date();

    // Update last login timestamp
    await tx.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: now },
    });

    // Create session record (stores SHA-256 token hash)
    const sessionRecord = await createAdminSessionRecord(
      admin.id,
      clientAddress,
      userAgent,
      tx,
    );

    // Create audit log referencing new session ID
    await tx.auditLog.create({
      data: {
        adminUserId: admin.id,
        action: "ADMIN_LOGIN_SUCCESS",
        entityType: "AdminSession",
        entityId: sessionRecord.sessionId,
      },
    });

    // Clear throttle entry
    await clearThrottle(normalized, clientAddress, tx);

    return sessionRecord;
  };

  const result = txPrisma
    ? await executeLoginTx(txPrisma)
    : await prisma.$transaction(executeLoginTx);

  const adminDto: AdminSessionDTO = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };

  return {
    success: true,
    rawToken: result.rawToken,
    sessionId: result.sessionId,
    admin: adminDto,
  };
}
