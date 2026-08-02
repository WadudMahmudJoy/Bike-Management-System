import "server-only";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  MAX_LOGIN_ATTEMPTS,
  THROTTLE_WINDOW_MS,
  BLOCK_DURATION_MS,
} from "./constants";

function getThrottleSecret(): string {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_RATE_LIMIT_SECRET must be at least 32 characters.");
  }
  return secret;
}

/** Generate HMAC-SHA256 throttle key from normalized email + client address. */
function computeThrottleKey(normalizedEmail: string, clientAddress: string): string {
  const secret = getThrottleSecret();
  return createHmac("sha256", secret)
    .update(`${normalizedEmail}:${clientAddress}`)
    .digest("hex");
}

export interface ThrottleCheckResult {
  blocked: boolean;
  retryAfterMs?: number;
}

/** Check whether the login attempt is throttled. */
export async function checkThrottle(
  normalizedEmail: string,
  clientAddress: string
): Promise<ThrottleCheckResult> {
  const keyHash = computeThrottleKey(normalizedEmail, clientAddress);
  const now = new Date();

  const record = await prisma.adminLoginThrottle.findUnique({
    where: { keyHash },
  });

  if (!record) return { blocked: false };

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterMs: record.blockedUntil.getTime() - now.getTime(),
    };
  }

  // Check if window has expired (reset)
  const windowEnd = new Date(record.windowStartedAt.getTime() + THROTTLE_WINDOW_MS);
  if (now > windowEnd) {
    return { blocked: false };
  }

  // Within window but under limit
  if (record.failureCount < MAX_LOGIN_ATTEMPTS) {
    return { blocked: false };
  }

  return { blocked: false };
}

/** Record a failed login attempt. */
export async function recordFailedAttempt(
  normalizedEmail: string,
  clientAddress: string
): Promise<void> {
  const keyHash = computeThrottleKey(normalizedEmail, clientAddress);
  const now = new Date();

  const existing = await prisma.adminLoginThrottle.findUnique({
    where: { keyHash },
  });

  if (!existing) {
    await prisma.adminLoginThrottle.create({
      data: {
        keyHash,
        failureCount: 1,
        windowStartedAt: now,
        lastAttemptAt: now,
      },
    });
    return;
  }

  // Check if window has expired
  const windowEnd = new Date(existing.windowStartedAt.getTime() + THROTTLE_WINDOW_MS);
  if (now > windowEnd) {
    // Reset window
    await prisma.adminLoginThrottle.update({
      where: { keyHash },
      data: {
        failureCount: 1,
        windowStartedAt: now,
        lastAttemptAt: now,
        blockedUntil: null,
      },
    });
    return;
  }

  const newCount = existing.failureCount + 1;
  const blockedUntil = newCount >= MAX_LOGIN_ATTEMPTS
    ? new Date(now.getTime() + BLOCK_DURATION_MS)
    : null;

  await prisma.adminLoginThrottle.update({
    where: { keyHash },
    data: {
      failureCount: newCount,
      lastAttemptAt: now,
      blockedUntil,
    },
  });
}

/** Clear throttle state after successful login. */
export async function clearThrottle(
  normalizedEmail: string,
  clientAddress: string
): Promise<void> {
  const keyHash = computeThrottleKey(normalizedEmail, clientAddress);
  await prisma.adminLoginThrottle.deleteMany({
    where: { keyHash },
  });
}
