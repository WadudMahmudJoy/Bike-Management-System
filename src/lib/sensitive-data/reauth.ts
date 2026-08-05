import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { verifyPassword } from "@/lib/auth/password";
import { SENSITIVE_ERRORS } from "./errors";
import type { Prisma } from "@/generated/prisma/client";

const REVEAL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REVEAL_FAILURES = 5;

function getRateLimitHmacSecret(): string {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_RATE_LIMIT_SECRET must be at least 32 characters.");
  }
  return secret;
}

function computeKeyHash(semanticInput: string): string {
  const secret = getRateLimitHmacSecret();
  return crypto.createHmac("sha256", secret).update(semanticInput, "utf8").digest("hex").toLowerCase();
}

export function getGlobalRevealKeyHash(adminId: string): string {
  return computeKeyHash(`sensitive-reveal:admin:${adminId}`);
}

export function getNetworkRevealKeyHash(adminId: string, clientIp: string): string {
  const safeIp = clientIp.trim() || "unknown";
  return computeKeyHash(`sensitive-reveal:admin-ip:${adminId}:${safeIp}`);
}

export async function checkRevealThrottle(
  adminId: string,
  clientIp: string,
  tx?: Prisma.TransactionClient
): Promise<{ isBlocked: boolean; blockedUntil: Date | null }> {
  const db = tx ?? prisma;
  const now = new Date();

  const globalHash = getGlobalRevealKeyHash(adminId);
  const networkHash = getNetworkRevealKeyHash(adminId, clientIp);

  const throttles = await db.adminLoginThrottle.findMany({
    where: { keyHash: { in: [globalHash, networkHash] } },
  });

  for (const t of throttles) {
    if (t.blockedUntil && t.blockedUntil > now) {
      return { isBlocked: true, blockedUntil: t.blockedUntil };
    }
  }

  return { isBlocked: false, blockedUntil: null };
}

export async function recordRevealFailure(
  adminId: string,
  clientIp: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  const now = new Date();

  const globalHash = getGlobalRevealKeyHash(adminId);
  const networkHash = getNetworkRevealKeyHash(adminId, clientIp);

  const keys = [globalHash, networkHash];

  for (const keyHash of keys) {
    const existing = await db.adminLoginThrottle.findUnique({
      where: { keyHash },
    });

    if (!existing) {
      await db.adminLoginThrottle.create({
        data: {
          keyHash,
          failureCount: 1,
          windowStartedAt: now,
          lastAttemptAt: now,
          blockedUntil: null,
        },
      });
    } else {
      const isWindowExpired = now.getTime() - existing.windowStartedAt.getTime() > REVEAL_WINDOW_MS;
      const newFailureCount = isWindowExpired ? 1 : existing.failureCount + 1;
      const windowStartedAt = isWindowExpired ? now : existing.windowStartedAt;

      let blockedUntil = existing.blockedUntil;
      if (newFailureCount >= MAX_REVEAL_FAILURES) {
        blockedUntil = new Date(now.getTime() + REVEAL_WINDOW_MS);
      } else if (isWindowExpired) {
        blockedUntil = null;
      }

      await db.adminLoginThrottle.update({
        where: { keyHash },
        data: {
          failureCount: newFailureCount,
          windowStartedAt,
          lastAttemptAt: now,
          blockedUntil,
        },
      });
    }
  }
}

export async function clearRevealThrottle(
  adminId: string,
  clientIp: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx ?? prisma;
  const globalHash = getGlobalRevealKeyHash(adminId);
  const networkHash = getNetworkRevealKeyHash(adminId, clientIp);

  await db.adminLoginThrottle.updateMany({
    where: { keyHash: { in: [globalHash, networkHash] } },
    data: {
      failureCount: 0,
      blockedUntil: null,
    },
  });
}

export async function verifyAdminPasswordForReveal(
  adminId: string,
  passwordInput: string,
  clientIp: string,
  skipDalSessionCheck = false
): Promise<void> {
  // 1. Require active admin session (unless caller already verified DAL session)
  if (!skipDalSessionCheck) {
    const authorizedAdmin = await requireAdmin();
    if (authorizedAdmin.id !== adminId) {
      throw new Error(SENSITIVE_ERRORS.REAUTHENTICATION_FAILED);
    }
  }

  // 2. Check dual reveal throttle
  const throttleStatus = await checkRevealThrottle(adminId, clientIp);
  if (throttleStatus.isBlocked) {
    throw new Error(SENSITIVE_ERRORS.REAUTHENTICATION_BLOCKED);
  }

  // 3. Load admin password hash
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!adminUser || !adminUser.isActive) {
    await recordRevealFailure(adminId, clientIp);
    throw new Error(SENSITIVE_ERRORS.REAUTHENTICATION_FAILED);
  }

  // 4. Verify password with Argon2id
  const isPasswordValid = await verifyPassword(adminUser.passwordHash, passwordInput);

  if (!isPasswordValid) {
    await recordRevealFailure(adminId, clientIp);
    throw new Error(SENSITIVE_ERRORS.REAUTHENTICATION_FAILED);
  }

  // 5. Success -> clear reveal throttle
  await clearRevealThrottle(adminId, clientIp);
}
