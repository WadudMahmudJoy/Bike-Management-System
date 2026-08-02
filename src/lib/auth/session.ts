import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateSessionToken, hashSessionToken } from "./token";
import {
  getSessionCookieName,
  SESSION_LIFETIME_MS,
} from "./constants";
import type { SessionVerificationResult } from "./types";

/**
 * Create a new admin session and set the session cookie.
 * The raw token is stored only in the cookie; the database stores its SHA-256 hash.
 */
export async function createAdminSession(
  adminId: string,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<void> {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.adminSession.create({
    data: {
      adminUserId: adminId,
      sessionTokenHash: tokenHash,
      expiresAt,
      ipAddress: ipAddress?.substring(0, 45) ?? null,
      userAgent: userAgent?.substring(0, 500) ?? null,
    },
  });

  const cookieName = getSessionCookieName();
  const isProd = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();

  cookieStore.set(cookieName, rawToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_LIFETIME_MS / 1000),
  });
}

/**
 * Get the raw session token from the cookie.
 * Returns null if the cookie is missing or empty.
 */
async function getSessionTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieName = getSessionCookieName();
  const value = cookieStore.get(cookieName)?.value;
  if (!value || value.trim().length === 0) return null;
  return value;
}

/**
 * Delete the session cookie using identical cookie configuration.
 * Uses the same path and name to ensure proper deletion.
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
 * Verify the current session from the cookie against the database.
 * Returns null if:
 * - Cookie is missing
 * - No matching session exists
 * - Session is revoked (revokedAt is not null)
 * - Session is expired (expiresAt <= now)
 * - Admin is inactive
 *
 * An invalid cookie is not accepted merely because it exists.
 */
export async function getCurrentAdminSession(): Promise<SessionVerificationResult | null> {
  const rawToken = await getSessionTokenFromCookie();
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();

  const session = await prisma.adminSession.findUnique({
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
 * Revoke the current session and delete the cookie.
 * Returns the admin user ID if a session was found, null otherwise.
 * Idempotent — safe to call even with no valid session.
 */
export async function revokeCurrentSession(): Promise<string | null> {
  const rawToken = await getSessionTokenFromCookie();
  if (!rawToken) {
    await deleteAdminSessionCookie();
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);

  try {
    const session = await prisma.adminSession.findUnique({
      where: { sessionTokenHash: tokenHash },
      select: { id: true, adminUserId: true, revokedAt: true },
    });

    if (session && session.revokedAt === null) {
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }

    await deleteAdminSessionCookie();
    return session?.adminUserId ?? null;
  } catch {
    await deleteAdminSessionCookie();
    return null;
  }
}

/**
 * Complete logout: revoke session, write audit log, delete cookie.
 * Idempotent — safe to call repeatedly.
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
