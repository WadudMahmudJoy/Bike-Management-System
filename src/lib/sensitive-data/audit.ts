import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type SensitiveAuditEventType =
  | "CUSTOMER_NID_SUBMITTED"
  | "CUSTOMER_NID_REPLACED"
  | "CUSTOMER_NID_VERIFIED"
  | "CUSTOMER_NID_MARKED_NEEDS_CORRECTION"
  | "CUSTOMER_NID_REVEALED"
  | "CUSTOMER_BANK_ACCOUNT_CREATED"
  | "CUSTOMER_BANK_ACCOUNT_METADATA_UPDATED"
  | "CUSTOMER_BANK_ACCOUNT_NUMBER_REPLACED"
  | "CUSTOMER_BANK_ACCOUNT_ARCHIVED"
  | "CUSTOMER_BANK_ACCOUNT_RESTORED"
  | "CUSTOMER_BANK_ACCOUNT_REVEALED"
  | "SENSITIVE_REAUTH_FAILED"
  | "SENSITIVE_REAUTH_BLOCKED"
  | "SENSITIVE_DATA_INTEGRITY_FAILURE";

export interface LogSensitiveAuditOptions {
  adminUserId: string;
  action: SensitiveAuditEventType;
  entityType: "CustomerIdentity" | "CustomerBankAccount" | "Customer";
  entityId: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logSensitiveAuditEvent(
  options: LogSensitiveAuditOptions,
  tx?: Prisma.TransactionClient
): Promise<{ id: string }> {
  const db = tx ?? prisma;

  // Sanitize previousValue and newValue to guarantee ZERO sensitive fields are logged
  const sanitizeValue = (val?: Record<string, unknown> | null): Record<string, unknown> | null => {
    if (!val) return null;
    const clean: Record<string, unknown> = {};
    const FORBIDDEN_KEYS = new Set([
      "nidNumber",
      "accountNumber",
      "encryptedNidNumber",
      "encryptedAccountNumber",
      "encryptionIv",
      "authTag",
      "keyVersion",
      "nidNumberHmac",
      "lastFour",
      "accountNumberLastFour",
      "password",
      "passwordHash",
      "token",
    ]);

    for (const [k, v] of Object.entries(val)) {
      if (!FORBIDDEN_KEYS.has(k)) {
        clean[k] = v;
      }
    }
    return clean;
  };

  const auditRow = await db.auditLog.create({
    data: {
      adminUserId: options.adminUserId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      previousValue: sanitizeValue(options.previousValue) as Prisma.InputJsonValue,
      newValue: sanitizeValue(options.newValue) as Prisma.InputJsonValue,
      ipAddress: options.ipAddress ?? null,
    },
    select: { id: true },
  });

  return auditRow;
}
