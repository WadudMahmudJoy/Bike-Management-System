import "server-only";
import { createHmac } from "crypto";
import { Prisma } from "@/generated/prisma/client";
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
export function computeThrottleKey(
  normalizedEmail: string,
  clientAddress: string,
): string {
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
  clientAddress: string,
  txPrisma?: Prisma.TransactionClient,
): Promise<ThrottleCheckResult> {
  const keyHash = computeThrottleKey(normalizedEmail, clientAddress);
  const now = new Date();
  const client = txPrisma ?? prisma;

  const record = await client.adminLoginThrottle.findUnique({
    where: { keyHash },
  });

  if (!record) return { blocked: false };

  // Check if currently blocked by blockedUntil timestamp
  if (record.blockedUntil && record.blockedUntil > now) {
    return {
      blocked: true,
      retryAfterMs: record.blockedUntil.getTime() - now.getTime(),
    };
  }

  // Check if window has expired (reset)
  const windowEnd = new Date(
    record.windowStartedAt.getTime() + THROTTLE_WINDOW_MS,
  );
  if (now > windowEnd) {
    return { blocked: false };
  }

  // Within window and reached failure limit
  if (record.failureCount >= MAX_LOGIN_ATTEMPTS) {
    return {
      blocked: true,
      retryAfterMs: BLOCK_DURATION_MS,
    };
  }

  return { blocked: false };
}

/**
 * Record a failed login attempt using an atomic PostgreSQL UPSERT statement.
 * Completely eliminates read-then-write race conditions and transaction aborts
 * under concurrent failed login attempts.
 */
export async function recordFailedAttempt(
  normalizedEmail: string,
  clientAddress: string,
  txPrisma?: Prisma.TransactionClient,
): Promise<void> {
  const keyHash = computeThrottleKey(normalizedEmail, clientAddress);
  const now = new Date();
  const windowThreshold = new Date(now.getTime() - THROTTLE_WINDOW_MS);
  const blockedUntilTime = new Date(now.getTime() + BLOCK_DURATION_MS);
  const client = txPrisma ?? prisma;

  await client.$executeRaw`
    INSERT INTO "AdminLoginThrottle" (
      "id",
      "keyHash",
      "failureCount",
      "windowStartedAt",
      "lastAttemptAt",
      "blockedUntil",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      ${keyHash},
      1,
      ${now},
      ${now},
      NULL,
      ${now}
    )
    ON CONFLICT ("keyHash") DO UPDATE SET
      "failureCount" = CASE
        WHEN "AdminLoginThrottle"."windowStartedAt" < ${windowThreshold} THEN 1
        ELSE "AdminLoginThrottle"."failureCount" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AdminLoginThrottle"."windowStartedAt" < ${windowThreshold} THEN ${now}
        ELSE "AdminLoginThrottle"."windowStartedAt"
      END,
      "lastAttemptAt" = ${now},
      "blockedUntil" = CASE
        WHEN (
          CASE
            WHEN "AdminLoginThrottle"."windowStartedAt" < ${windowThreshold} THEN 1
            ELSE "AdminLoginThrottle"."failureCount" + 1
          END
        ) >= ${MAX_LOGIN_ATTEMPTS} THEN ${blockedUntilTime}
        ELSE "AdminLoginThrottle"."blockedUntil"
      END,
      "updatedAt" = ${now};
  `;
}

/** Clear throttle state after successful login. */
export async function clearThrottle(
  normalizedEmail: string,
  clientAddress: string,
  txPrisma?: Prisma.TransactionClient,
): Promise<void> {
  const keyHash = computeThrottleKey(normalizedEmail, clientAddress);
  const client = txPrisma ?? prisma;
  await client.adminLoginThrottle.deleteMany({
    where: { keyHash },
  });
}
