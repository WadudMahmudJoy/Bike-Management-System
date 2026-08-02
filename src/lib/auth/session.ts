import "server-only";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSessionToken, hashSessionToken } from "./token";
import {
  getSessionCookieName,
  getAdminSessionCookieOptions,
  SESSION_LIFETIME_MS,
} from "./constants";
import type { SessionVerificationResult } from "./types";

/** Result returned by createAdminSessionRecord. */
export interface CreateSessionRecordResult {
  sessionId: string;
  rawToken: string;
  expiresAt: Date;
}

/**
 * Create a new admin session database record.
 * Generates rawToken, computes SHA-256 hash, and inserts row into AdminSession.
 * Database stores ONLY sessionTokenHash.
 */
export async function createAdminSessionRecord(
  adminId: string,
  ipAddress: string | null,
  userAgent: string | null,
  txPrisma?: Prisma.TransactionClient,
): Promise<CreateSessionRecordResult> {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  const client = txPrisma ?? prisma;

  const session = await client.adminSession.create({
    data: {
      adminUserId: adminId,
      sessionTokenHash: tokenHash,
      expiresAt,
      ipAddress: ipAddress?.substring(0, 45) ?? null,
      userAgent: userAgent?.substring(0, 500) ?? null,
    },
  });

  return {
    sessionId: session.id,
    rawToken,
    expiresAt,
  };
}

/**
 * Verify a raw session token against the database.
 * Computes hashSessionToken(rawToken) and queries AdminSession table.
 * Returns null if:
 * - Token is empty/invalid
 * - Session record does not exist
 * - Session is revoked (revokedAt is not null)
 * - Session is expired (expiresAt <= now)
 * - Admin account is inactive (!admin.isActive)
 */
export async function verifyAdminSessionToken(
  rawToken: string,
  txPrisma?: Prisma.TransactionClient,
): Promise<SessionVerificationResult | null> {
  if (!rawToken || rawToken.trim().length === 0) return null;

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const client = txPrisma ?? prisma;

  const session = await client.adminSession.findUnique({
    where: { sessionTokenHash: tokenHash },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt !== null) return null;
  if (session.expiresAt <= now) return null;
  if (!session.admin.isActive) return null;

  return {
    admin: {
      id: session.admin.id,
      name: session.admin.name,
      email: session.admin.email,
      role: session.admin.role,
    },
    sessionId: session.id,
  };
}

/**
 * Revoke a session record in the database by raw token.
 * Computes SHA-256 hash and updates revokedAt timestamp.
 * Idempotent — safe to call repeatedly.
 */
export async function revokeAdminSessionToken(
  rawToken: string,
  txPrisma?: Prisma.TransactionClient,
): Promise<string | null> {
  if (!rawToken || rawToken.trim().length === 0) return null;

  const tokenHash = hashSessionToken(rawToken);
  const client = txPrisma ?? prisma;

  try {
    const session = await client.adminSession.findUnique({
      where: { sessionTokenHash: tokenHash },
      select: { id: true, adminUserId: true, revokedAt: true },
    });

    if (session && session.revokedAt === null) {
      await client.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }

    return session?.adminUserId ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a new admin session record and set the session cookie.
 */
export async function createAdminSession(
  adminId: string,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<void> {
  const { rawToken, expiresAt } = await createAdminSessionRecord(
    adminId,
    ipAddress,
    userAgent,
  );

  const cookieName = getSessionCookieName();
  const cookieOptions = getAdminSessionCookieOptions(expiresAt);
  const cookieStore = await cookies();

  cookieStore.set(cookieName, rawToken, cookieOptions);
}

/**
 * Get raw session token from the current request cookie.
 */
async function getSessionTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieName = getSessionCookieName();
  const value = cookieStore.get(cookieName)?.value;
  if (!value || value.trim().length === 0) return null;
  return value;
}

/**
 * Delete the session cookie from the browser.
 */
export async function deleteAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const cookieName = getSessionCookieName();
  cookieStore.delete({
    name: cookieName,
    path: "/",
  });
}

/**
 * Verify the current request session from the cookie.
 */
export async function getCurrentAdminSession(): Promise<SessionVerificationResult | null> {
  const rawToken = await getSessionTokenFromCookie();
  if (!rawToken) return null;
  return verifyAdminSessionToken(rawToken);
}

/**
 * Revoke the current request session and delete the cookie.
 */
export async function revokeCurrentSession(): Promise<string | null> {
  const rawToken = await getSessionTokenFromCookie();
  if (!rawToken) {
    await deleteAdminSessionCookie();
    return null;
  }

  const adminUserId = await revokeAdminSessionToken(rawToken);
  await deleteAdminSessionCookie();
  return adminUserId;
}

/**
 * Complete logout: revoke session, write audit log, delete cookie.
 */
export async function logoutAdmin(): Promise<void> {
  const adminUserId = await revokeCurrentSession();

  if (adminUserId) {
    try {
      await prisma.auditLog.create({
        data: {
          adminUserId,
          action: "ADMIN_LOGOUT",
          entityType: "AdminSession",
          entityId: adminUserId,
        },
      });
    } catch {
      // Logout must not fail visibly even if audit log write fails
    }
  }
}
