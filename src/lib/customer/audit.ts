import "server-only";
import { prisma } from "@/lib/prisma";
import type { CustomerRoleType } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

/**
 * Creates a privacy-compliant AuditLog entry for customer operations.
 * GUARANTEE: Never logs raw phone numbers, NID numbers, bank details, or internal notes.
 */
export async function createCustomerAuditLog(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: {
    adminUserId: string;
    action: "CUSTOMER_CREATED" | "CUSTOMER_UPDATED" | "CUSTOMER_ARCHIVED" | "CUSTOMER_RESTORED";
    customerId: string;
    customerCode: string;
    roles?: CustomerRoleType[];
    changedFields?: string[];
    duplicatePhoneConfirmed?: boolean;
  }
) {
  const { adminUserId, action, customerId, customerCode, roles, changedFields, duplicatePhoneConfirmed } = params;

  let newValuePayload: Prisma.InputJsonValue = {};

  if (action === "CUSTOMER_CREATED") {
    newValuePayload = {
      customerCode,
      roles: roles ?? [],
      duplicatePhoneConfirmed: duplicatePhoneConfirmed ?? false,
    };
  } else if (action === "CUSTOMER_UPDATED") {
    newValuePayload = {
      customerCode,
      changedFields: changedFields ?? [],
      roles: roles ?? [],
      duplicatePhoneConfirmed: duplicatePhoneConfirmed ?? false,
    };
  } else if (action === "CUSTOMER_ARCHIVED") {
    newValuePayload = { customerCode, isArchived: true };
  } else if (action === "CUSTOMER_RESTORED") {
    newValuePayload = { customerCode, isArchived: false };
  }

  await tx.auditLog.create({
    data: {
      adminUserId,
      action,
      entityType: "Customer",
      entityId: customerId,
      newValue: newValuePayload,
    },
  });
}
