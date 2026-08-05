import "server-only";
import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "./customer-code";
import { normalizeBangladeshPhone } from "./phone";
import { checkDuplicatePhone, getCustomerById } from "./queries";
import { createCustomerAuditLog } from "./audit";
import { createCustomerSchema, updateCustomerSchema } from "./validation";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerDetailDTO,
  DuplicateCheckResult,
} from "./types";


export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; duplicateWarning?: DuplicateCheckResult };

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Creates a new Customer record within a single database transaction.
 * Enforces phone normalization, duplicate warnings, role creation, and default PENDING NID status.
 */
export async function createCustomer(
  adminId: string,
  input: CreateCustomerInput,
  txClient?: TxClient
): Promise<ServiceResult<CustomerDetailDTO>> {
  if (!adminId) {
    return { success: false, error: "Authenticated administrator identity is required." };
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues[0]?.message ?? "Invalid input data.";
    return { success: false, error: issueMsg };
  }

  const data = parsed.data;
  const phoneNormalized = normalizeBangladeshPhone(data.phone);
  if (!phoneNormalized) {
    return { success: false, error: "Invalid Bangladesh primary phone number." };
  }

  const whatsappNormalized = data.whatsappNumber
    ? normalizeBangladeshPhone(data.whatsappNumber)
    : null;

  const executeTransaction = async (tx: TxClient) => {
    // Re-check duplicate phone numbers server-side within current transaction scope
    const dupCheck = await checkDuplicatePhone(phoneNormalized, undefined, tx);
    if (dupCheck.hasDuplicates) {
      if (!data.confirmDuplicate) {
        return {
          success: false as const,
          error: "One or more customers with this phone number already exist.",
          duplicateWarning: dupCheck,
        };
      }

      const expectedSet = new Set(data.expectedDuplicateCustomerIds ?? []);
      const currentSet = new Set(dupCheck.duplicateCustomerIds);

      const isMatch =
        expectedSet.size === currentSet.size &&
        [...expectedSet].every((id) => currentSet.has(id));

      if (!isMatch) {
        return {
          success: false as const,
          error: "Matching phone records have changed. Please review the updated duplicate list and confirm again.",
          duplicateWarning: dupCheck,
        };
      }
    }

    const uniqueRoles = Array.from(new Set(data.roles));
    const customerCode = await generateCustomerCode(tx);

    const customer = await tx.customer.create({
      data: {
        customerCode,
        fullName: data.fullName,
        fatherName: data.fatherName,
        phone: data.phone.trim(),
        phoneNormalized,
        whatsappNumber: data.whatsappNumber?.trim() ?? null,
        whatsappNormalized,
        email: data.email?.toLowerCase().trim() ?? null,
        address: data.address,
        emergencyContact: data.emergencyContact,
        internalNotes: data.internalNotes,
        isArchived: false,
        createdByAdminId: adminId,
      },
    });

    await tx.customerRole.createMany({
      data: uniqueRoles.map((role) => ({
        customerId: customer.id,
        role,
      })),
    });

    await tx.customerIdentity.create({
      data: {
        customerId: customer.id,
        nidStatus: "PENDING",
      },
    });

    await createCustomerAuditLog(tx, {
      adminUserId: adminId,
      action: "CUSTOMER_CREATED",
      customerId: customer.id,
      customerCode,
      roles: uniqueRoles,
      duplicatePhoneConfirmed: dupCheck.hasDuplicates && data.confirmDuplicate,
    });

    const createdDetail = await getCustomerById(customer.id, tx);
    if (!createdDetail) {
      return { success: false as const, error: "Customer created but failed to retrieve details." };
    }

    return { success: true as const, data: createdDetail };
  };

  try {
    if (txClient) {
      return await executeTransaction(txClient);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create customer record.";
    return { success: false, error: msg };
  }
}

/**
 * Transactionally updates an existing Customer record using atomic optimistic concurrency.
 */
export async function updateCustomer(
  adminId: string,
  id: string,
  input: UpdateCustomerInput,
  txClient?: TxClient
): Promise<ServiceResult<CustomerDetailDTO>> {
  if (!adminId) {
    return { success: false, error: "Authenticated administrator identity is required." };
  }

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues[0]?.message ?? "Invalid input data.";
    return { success: false, error: issueMsg };
  }

  const data = parsed.data;
  const phoneNormalized = normalizeBangladeshPhone(data.phone);
  if (!phoneNormalized) {
    return { success: false, error: "Invalid Bangladesh primary phone number." };
  }

  const whatsappNormalized = data.whatsappNumber
    ? normalizeBangladeshPhone(data.whatsappNumber)
    : null;

  const expectedDate = new Date(data.expectedUpdatedAt);
  if (isNaN(expectedDate.getTime())) {
    return { success: false, error: "Invalid expected update timestamp." };
  }

  const executeTransaction = async (tx: TxClient) => {
    const dupCheck = await checkDuplicatePhone(phoneNormalized, id, tx);
    if (dupCheck.hasDuplicates) {
      if (!data.confirmDuplicate) {
        return {
          success: false as const,
          error: "One or more other customers with this phone number already exist.",
          duplicateWarning: dupCheck,
        };
      }

      const expectedSet = new Set(data.expectedDuplicateCustomerIds ?? []);
      const currentSet = new Set(dupCheck.duplicateCustomerIds);

      const isMatch =
        expectedSet.size === currentSet.size &&
        [...expectedSet].every((dupId) => currentSet.has(dupId));

      if (!isMatch) {
        return {
          success: false as const,
          error: "Matching phone records have changed. Please review the updated duplicate list and confirm again.",
          duplicateWarning: dupCheck,
        };
      }
    }

    const existing = await tx.customer.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!existing) {
      return { success: false as const, error: "Customer record not found." };
    }

    const uniqueRoles = Array.from(new Set(data.roles));

    const changedFields: string[] = [];
    if (existing.fullName !== data.fullName) changedFields.push("fullName");
    if (existing.fatherName !== data.fatherName) changedFields.push("fatherName");
    if (existing.phoneNormalized !== phoneNormalized) changedFields.push("phone");
    if (existing.whatsappNormalized !== whatsappNormalized) changedFields.push("whatsappNumber");
    if (existing.email !== (data.email?.toLowerCase().trim() ?? null)) changedFields.push("email");
    if (existing.address !== data.address) changedFields.push("address");
    if (existing.emergencyContact !== data.emergencyContact) changedFields.push("emergencyContact");
    if (existing.internalNotes !== data.internalNotes) changedFields.push("internalNotes");

    const existingRoles = existing.roles.map((r) => r.role).sort();
    const newRoles = [...uniqueRoles].sort();
    if (JSON.stringify(existingRoles) !== JSON.stringify(newRoles)) {
      changedFields.push("roles");
    }

    const updateResult = await tx.customer.updateMany({
      where: {
        id,
        updatedAt: expectedDate,
      },
      data: {
        fullName: data.fullName,
        fatherName: data.fatherName,
        phone: data.phone.trim(),
        phoneNormalized,
        whatsappNumber: data.whatsappNumber?.trim() ?? null,
        whatsappNormalized,
        email: data.email?.toLowerCase().trim() ?? null,
        address: data.address,
        emergencyContact: data.emergencyContact,
        internalNotes: data.internalNotes,
      },
    });

    if (updateResult.count !== 1) {
      throw new Error(
        "CONCURRENCY_CONFLICT: This customer record was modified by another administrator. Please refresh and try again."
      );
    }

    await tx.customerRole.deleteMany({
      where: { customerId: id },
    });

    await tx.customerRole.createMany({
      data: uniqueRoles.map((role) => ({
        customerId: id,
        role,
      })),
    });

    await createCustomerAuditLog(tx, {
      adminUserId: adminId,
      action: "CUSTOMER_UPDATED",
      customerId: id,
      customerCode: existing.customerCode ?? id.substring(0, 8),
      roles: uniqueRoles,
      changedFields,
      duplicatePhoneConfirmed: dupCheck.hasDuplicates && data.confirmDuplicate,
    });

    const updatedDetail = await getCustomerById(id, tx);
    if (!updatedDetail) {
      return { success: false as const, error: "Customer updated but failed to retrieve details." };
    }

    return { success: true as const, data: updatedDetail };
  };

  try {
    if (txClient) {
      return await executeTransaction(txClient);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update customer record.";
    return { success: false, error: msg };
  }
}

/**
 * Transactionally archives (deactivates) a Customer record with concurrency protection.
 */
export async function archiveCustomer(
  adminId: string,
  id: string,
  expectedUpdatedAt?: string,
  txClient?: TxClient
): Promise<ServiceResult<CustomerDetailDTO>> {
  if (!adminId) {
    return { success: false, error: "Authenticated administrator identity is required." };
  }

  const executeTransaction = async (tx: TxClient) => {
    const existing = await tx.customer.findUnique({ where: { id } });
    if (!existing) {
      return { success: false as const, error: "Customer record not found." };
    }
    if (existing.isArchived) {
      return { success: false as const, error: "Customer is already archived." };
    }

    const whereClause: { id: string; isArchived: boolean; updatedAt?: Date } = {
      id,
      isArchived: false,
    };

    if (expectedUpdatedAt) {
      const expectedDate = new Date(expectedUpdatedAt);
      if (!isNaN(expectedDate.getTime())) {
        whereClause.updatedAt = expectedDate;
      }
    }

    const updateResult = await tx.customer.updateMany({
      where: whereClause,
      data: { isArchived: true },
    });

    if (updateResult.count !== 1) {
      throw new Error(
        "CONCURRENCY_CONFLICT: Customer record could not be archived due to concurrent modification or state change."
      );
    }

    await createCustomerAuditLog(tx, {
      adminUserId: adminId,
      action: "CUSTOMER_ARCHIVED",
      customerId: id,
      customerCode: existing.customerCode ?? id.substring(0, 8),
    });

    const detail = await getCustomerById(id, tx);
    if (!detail) {
      return { success: false as const, error: "Customer archived but failed to retrieve details." };
    }

    return { success: true as const, data: detail };
  };

  try {
    if (txClient) {
      return await executeTransaction(txClient);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to archive customer.";
    return { success: false, error: msg };
  }
}

/**
 * Transactionally restores (reactivates) an archived Customer record with concurrency protection.
 */
export async function restoreCustomer(
  adminId: string,
  id: string,
  expectedUpdatedAt?: string,
  txClient?: TxClient
): Promise<ServiceResult<CustomerDetailDTO>> {
  if (!adminId) {
    return { success: false, error: "Authenticated administrator identity is required." };
  }

  const executeTransaction = async (tx: TxClient) => {
    const existing = await tx.customer.findUnique({ where: { id } });
    if (!existing) {
      return { success: false as const, error: "Customer record not found." };
    }
    if (!existing.isArchived) {
      return { success: false as const, error: "Customer is already active." };
    }

    const whereClause: { id: string; isArchived: boolean; updatedAt?: Date } = {
      id,
      isArchived: true,
    };

    if (expectedUpdatedAt) {
      const expectedDate = new Date(expectedUpdatedAt);
      if (!isNaN(expectedDate.getTime())) {
        whereClause.updatedAt = expectedDate;
      }
    }

    const updateResult = await tx.customer.updateMany({
      where: whereClause,
      data: { isArchived: false },
    });

    if (updateResult.count !== 1) {
      throw new Error(
        "CONCURRENCY_CONFLICT: Customer record could not be restored due to concurrent modification or state change."
      );
    }

    await createCustomerAuditLog(tx, {
      adminUserId: adminId,
      action: "CUSTOMER_RESTORED",
      customerId: id,
      customerCode: existing.customerCode ?? id.substring(0, 8),
    });

    const detail = await getCustomerById(id, tx);
    if (!detail) {
      return { success: false as const, error: "Customer restored but failed to retrieve details." };
    }

    return { success: true as const, data: detail };
  };

  try {
    if (txClient) {
      return await executeTransaction(txClient);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to restore customer.";
    return { success: false, error: msg };
  }
}
