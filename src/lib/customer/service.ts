import "server-only";
import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "./customer-code";
import { normalizeBangladeshPhone } from "./phone";
import { checkDuplicatePhone } from "./queries";
import { createCustomerAuditLog } from "./audit";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdSchema,
  isoTimestampSchema,
} from "./validation";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateCustomerResultDTO,
  UpdateCustomerResultDTO,
  ArchiveCustomerResultDTO,
  DuplicateWarningDTO,
} from "./types";

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; duplicateWarning?: DuplicateWarningDTO };

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Known safe customer domain error messages */
export const CUSTOMER_ERRORS = {
  UNAUTHORIZED: "Authenticated administrator identity is required.",
  NOT_FOUND: "Customer record not found.",
  INVALID_INPUT: "Invalid customer payload data.",
  INVALID_PHONE: "Invalid Bangladesh primary phone number.",
  INVALID_TIMESTAMP: "Expected update timestamp is required for concurrency control.",
  CONCURRENCY_CONFLICT: "This customer record was modified by another administrator. Please refresh and try again.",
  DUPLICATE_REQUIRED: "One or more customers with this phone number already exist.",
  DUPLICATE_SET_CHANGED: "Matching phone records have changed. Please review the updated duplicate list and confirm again.",
  ALREADY_ARCHIVED: "Customer is already archived.",
  ALREADY_ACTIVE: "Customer is already active.",
  GENERIC_CREATE_FAIL: "Unable to create the customer record. Please try again.",
  GENERIC_UPDATE_FAIL: "Unable to update the customer record. Please try again.",
  GENERIC_STATUS_FAIL: "Unable to change the customer status. Please try again.",
} as const;

/**
 * Creates a new Customer record within a single database transaction.
 * Enforces phone normalization, duplicate warnings, role creation, and default PENDING NID status.
 */
export async function createCustomer(
  adminId: string,
  input: CreateCustomerInput,
  txClient?: TxClient
): Promise<ServiceResult<CreateCustomerResultDTO>> {
  if (!adminId) {
    return { success: false, error: CUSTOMER_ERRORS.UNAUTHORIZED };
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues[0]?.message ?? CUSTOMER_ERRORS.INVALID_INPUT;
    return { success: false, error: issueMsg };
  }

  const data = parsed.data;
  const phoneNormalized = normalizeBangladeshPhone(data.phone);
  if (!phoneNormalized) {
    return { success: false, error: CUSTOMER_ERRORS.INVALID_PHONE };
  }

  const whatsappNormalized = data.whatsappNumber
    ? normalizeBangladeshPhone(data.whatsappNumber)
    : null;

  const executeTransaction = async (tx: TxClient): Promise<ServiceResult<CreateCustomerResultDTO>> => {
    // Re-check duplicate phone numbers server-side within transaction scope
    const dupCheck = await checkDuplicatePhone(phoneNormalized, undefined, tx);
    if (dupCheck.hasDuplicates) {
      if (!data.confirmDuplicate) {
        return {
          success: false,
          error: CUSTOMER_ERRORS.DUPLICATE_REQUIRED,
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
          success: false,
          error: CUSTOMER_ERRORS.DUPLICATE_SET_CHANGED,
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
        email: data.email,
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

    return { success: true, data: { customerId: customer.id } };
  };

  try {
    if (txClient) {
      return await executeTransaction(txClient);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(CUSTOMER_ERRORS).includes(err.message as typeof CUSTOMER_ERRORS[keyof typeof CUSTOMER_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: CUSTOMER_ERRORS.GENERIC_CREATE_FAIL };
  }
}

/**
 * Transactionally updates an existing Customer record using atomic optimistic concurrency.
 * Duplicate checking is executed ONLY when the primary phone number has changed.
 */
export async function updateCustomer(
  adminId: string,
  id: string,
  input: UpdateCustomerInput,
  txClient?: TxClient
): Promise<ServiceResult<UpdateCustomerResultDTO>> {
  if (!adminId) {
    return { success: false, error: CUSTOMER_ERRORS.UNAUTHORIZED };
  }

  const idParsed = customerIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: CUSTOMER_ERRORS.NOT_FOUND };
  }

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const issueMsg = parsed.error.issues[0]?.message ?? CUSTOMER_ERRORS.INVALID_INPUT;
    return { success: false, error: issueMsg };
  }

  const data = parsed.data;
  const phoneNormalized = normalizeBangladeshPhone(data.phone);
  if (!phoneNormalized) {
    return { success: false, error: CUSTOMER_ERRORS.INVALID_PHONE };
  }

  const whatsappNormalized = data.whatsappNumber
    ? normalizeBangladeshPhone(data.whatsappNumber)
    : null;

  const expectedDate = new Date(data.expectedUpdatedAt);

  const executeTransaction = async (tx: TxClient): Promise<ServiceResult<UpdateCustomerResultDTO>> => {
    const existing = await tx.customer.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!existing) {
      return { success: false, error: CUSTOMER_ERRORS.NOT_FOUND };
    }

    const phoneChanged = existing.phoneNormalized !== phoneNormalized;

    // Perform duplicate check ONLY if phone has changed
    let dupCheck: DuplicateWarningDTO = { hasDuplicates: false, matchingCustomers: [], duplicateCustomerIds: [] };
    if (phoneChanged) {
      dupCheck = await checkDuplicatePhone(phoneNormalized, id, tx);
      if (dupCheck.hasDuplicates) {
        if (!data.confirmDuplicate) {
          return {
            success: false,
            error: CUSTOMER_ERRORS.DUPLICATE_REQUIRED,
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
            success: false,
            error: CUSTOMER_ERRORS.DUPLICATE_SET_CHANGED,
            duplicateWarning: dupCheck,
          };
        }
      }
    }

    const uniqueRoles = Array.from(new Set(data.roles));

    const changedFields: string[] = [];
    if (existing.fullName !== data.fullName) changedFields.push("fullName");
    if (existing.fatherName !== data.fatherName) changedFields.push("fatherName");
    if (phoneChanged) changedFields.push("phone");
    if (existing.whatsappNormalized !== whatsappNormalized) changedFields.push("whatsappNumber");
    if (existing.email !== data.email) changedFields.push("email");
    if (existing.address !== data.address) changedFields.push("address");
    if (existing.emergencyContact !== data.emergencyContact) changedFields.push("emergencyContact");
    if (existing.internalNotes !== data.internalNotes) changedFields.push("internalNotes");

    const existingRoles = existing.roles.map((r) => r.role).sort();
    const newRoles = [...uniqueRoles].sort();
    if (JSON.stringify(existingRoles) !== JSON.stringify(newRoles)) {
      changedFields.push("roles");
    }

    // Atomic update matching id and expectedUpdatedAt
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
        email: data.email,
        address: data.address,
        emergencyContact: data.emergencyContact,
        internalNotes: data.internalNotes,
      },
    });

    if (updateResult.count !== 1) {
      return { success: false, error: CUSTOMER_ERRORS.CONCURRENCY_CONFLICT };
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

    const updatedRecord = await tx.customer.findUnique({
      where: { id },
      select: { updatedAt: true },
    });

    return {
      success: true,
      data: {
        customerId: id,
        updatedAt: updatedRecord?.updatedAt.toISOString() ?? new Date().toISOString(),
      },
    };
  };

  try {
    if (txClient) {
      return await executeTransaction(txClient);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(CUSTOMER_ERRORS).includes(err.message as typeof CUSTOMER_ERRORS[keyof typeof CUSTOMER_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: CUSTOMER_ERRORS.GENERIC_UPDATE_FAIL };
  }
}

/**
 * Transactionally archives (deactivates) a Customer record with atomic concurrency protection.
 * Requires a valid expectedUpdatedAt timestamp.
 */
export async function archiveCustomer(
  adminId: string,
  id: string,
  expectedUpdatedAt: string,
  txClient?: TxClient
): Promise<ServiceResult<ArchiveCustomerResultDTO>> {
  if (!adminId) {
    return { success: false, error: CUSTOMER_ERRORS.UNAUTHORIZED };
  }

  const idParsed = customerIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: CUSTOMER_ERRORS.NOT_FOUND };
  }

  const dateParsed = isoTimestampSchema.safeParse(expectedUpdatedAt);
  if (!dateParsed.success) {
    return { success: false, error: CUSTOMER_ERRORS.INVALID_TIMESTAMP };
  }

  const expectedDate = new Date(expectedUpdatedAt);

  const executeTransaction = async (tx: TxClient): Promise<ServiceResult<ArchiveCustomerResultDTO>> => {
    const existing = await tx.customer.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: CUSTOMER_ERRORS.NOT_FOUND };
    }
    if (existing.isArchived) {
      return { success: false, error: CUSTOMER_ERRORS.ALREADY_ARCHIVED };
    }

    const updateResult = await tx.customer.updateMany({
      where: {
        id,
        isArchived: false,
        updatedAt: expectedDate,
      },
      data: { isArchived: true },
    });

    if (updateResult.count !== 1) {
      return { success: false, error: CUSTOMER_ERRORS.CONCURRENCY_CONFLICT };
    }

    await createCustomerAuditLog(tx, {
      adminUserId: adminId,
      action: "CUSTOMER_ARCHIVED",
      customerId: id,
      customerCode: existing.customerCode ?? id.substring(0, 8),
    });

    const updatedRecord = await tx.customer.findUnique({
      where: { id },
      select: { updatedAt: true },
    });

    return {
      success: true,
      data: {
        customerId: id,
        isArchived: true,
        updatedAt: updatedRecord?.updatedAt.toISOString() ?? new Date().toISOString(),
      },
    };
  };

  try {
    if (txClient) {
      return await executeTransaction(txClient);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(CUSTOMER_ERRORS).includes(err.message as typeof CUSTOMER_ERRORS[keyof typeof CUSTOMER_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: CUSTOMER_ERRORS.GENERIC_STATUS_FAIL };
  }
}

/**
 * Transactionally restores (reactivates) an archived Customer record with atomic concurrency protection.
 * Requires a valid expectedUpdatedAt timestamp.
 */
export async function restoreCustomer(
  adminId: string,
  id: string,
  expectedUpdatedAt: string,
  txClient?: TxClient
): Promise<ServiceResult<ArchiveCustomerResultDTO>> {
  if (!adminId) {
    return { success: false, error: CUSTOMER_ERRORS.UNAUTHORIZED };
  }

  const idParsed = customerIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: CUSTOMER_ERRORS.NOT_FOUND };
  }

  const dateParsed = isoTimestampSchema.safeParse(expectedUpdatedAt);
  if (!dateParsed.success) {
    return { success: false, error: CUSTOMER_ERRORS.INVALID_TIMESTAMP };
  }

  const expectedDate = new Date(expectedUpdatedAt);

  const executeTransaction = async (tx: TxClient): Promise<ServiceResult<ArchiveCustomerResultDTO>> => {
    const existing = await tx.customer.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: CUSTOMER_ERRORS.NOT_FOUND };
    }
    if (!existing.isArchived) {
      return { success: false, error: CUSTOMER_ERRORS.ALREADY_ACTIVE };
    }

    const updateResult = await tx.customer.updateMany({
      where: {
        id,
        isArchived: true,
        updatedAt: expectedDate,
      },
      data: { isArchived: false },
    });

    if (updateResult.count !== 1) {
      return { success: false, error: CUSTOMER_ERRORS.CONCURRENCY_CONFLICT };
    }

    await createCustomerAuditLog(tx, {
      adminUserId: adminId,
      action: "CUSTOMER_RESTORED",
      customerId: id,
      customerCode: existing.customerCode ?? id.substring(0, 8),
    });

    const updatedRecord = await tx.customer.findUnique({
      where: { id },
      select: { updatedAt: true },
    });

    return {
      success: true,
      data: {
        customerId: id,
        isArchived: false,
        updatedAt: updatedRecord?.updatedAt.toISOString() ?? new Date().toISOString(),
      },
    };
  };

  try {
    if (txClient) {
      return await executeTransaction(txClient);
    } else {
      return await prisma.$transaction(executeTransaction);
    }
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(CUSTOMER_ERRORS).includes(err.message as typeof CUSTOMER_ERRORS[keyof typeof CUSTOMER_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: CUSTOMER_ERRORS.GENERIC_STATUS_FAIL };
  }
}
