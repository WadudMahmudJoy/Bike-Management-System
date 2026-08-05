import "server-only";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { encryptSensitiveValue, decryptSensitiveValue } from "./crypto";
import {
  normalizeBangladeshNid,
  getNidLastFour,
  computeNidLookupHmac,
  isValidNidStatusTransition,
} from "./nid";
import {
  normalizeBankAccountNumber,
  getBankAccountLastFour,
} from "./bank-account";
import { verifyAdminPasswordForReveal } from "./reauth";
import { logSensitiveAuditEvent } from "./audit";
import { SENSITIVE_ERRORS } from "./errors";
import type {
  MaskedCustomerIdentityDTO,
  MaskedCustomerBankAccountDTO,
  SensitiveRevealResult,
} from "./types";
import type { Prisma } from "@/generated/prisma/client";

function mapIdentityToMaskedDTO(identity: {
  id: string;
  customerId: string;
  nidStatus: string;
  encryptedNidNumber: string | null;
  lastFour: string | null;
  submittedAt: Date | null;
  verifiedAt: Date | null;
  verifiedByAdmin: { id: string; name: string } | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MaskedCustomerIdentityDTO {
  const hasEncryptedData = Boolean(identity.encryptedNidNumber);
  const maskedNid = identity.lastFour ? `******${identity.lastFour}` : null;

  return {
    id: identity.id,
    customerId: identity.customerId,
    nidStatus: identity.nidStatus as MaskedCustomerIdentityDTO["nidStatus"],
    maskedNid,
    hasEncryptedData,
    submittedAt: identity.submittedAt?.toISOString() ?? null,
    verifiedAt: identity.verifiedAt?.toISOString() ?? null,
    verifiedByAdmin: identity.verifiedByAdmin,
    notes: identity.notes,
    createdAt: identity.createdAt.toISOString(),
    updatedAt: identity.updatedAt.toISOString(),
  };
}

function mapBankAccountToMaskedDTO(account: {
  id: string;
  customerId: string;
  bankName: string;
  accountHolderName: string;
  branchName: string | null;
  accountNumberLastFour: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): MaskedCustomerBankAccountDTO {
  const maskedAccountNumber = account.accountNumberLastFour
    ? `******${account.accountNumberLastFour}`
    : "******0000";

  return {
    id: account.id,
    customerId: account.customerId,
    bankName: account.bankName,
    accountHolderName: account.accountHolderName,
    branchName: account.branchName,
    maskedAccountNumber,
    isActive: account.isActive,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export async function getMaskedCustomerIdentity(
  customerId: string,
  tx?: Prisma.TransactionClient
): Promise<MaskedCustomerIdentityDTO | null> {
  const db = tx ?? prisma;
  const identity = await db.customerIdentity.findUnique({
    where: { customerId },
    select: {
      id: true,
      customerId: true,
      nidStatus: true,
      encryptedNidNumber: true,
      lastFour: true,
      submittedAt: true,
      verifiedAt: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      verifiedByAdmin: {
        select: { id: true, name: true },
      },
    },
  });

  if (!identity) return null;
  return mapIdentityToMaskedDTO(identity);
}

export async function submitCustomerNid(
  adminId: string,
  customerId: string,
  rawNid: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerIdentityDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const normNid = normalizeBangladeshNid(rawNid);
    const lastFour = getNidLastFour(normNid);
    const nidHmac = computeNidLookupHmac(normNid);

    // Rule 9: Treat missing CustomerIdentity as an integrity failure
    const existingIdentity = await db.customerIdentity.findUnique({
      where: { customerId },
    });

    if (!existingIdentity) {
      return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
    }

    if (existingIdentity.nidStatus !== "PENDING") {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_NID_TRANSITION };
    }

    // Duplicate check: hard-block duplicate NID across all customers (active or archived)
    const duplicateNidMatch = await db.customerIdentity.findUnique({
      where: { nidNumberHmac: nidHmac },
      select: { customerId: true, customer: { select: { customerCode: true, fullName: true, isArchived: true } } },
    });

    if (duplicateNidMatch) {
      return { success: false, error: SENSITIVE_ERRORS.NID_ALREADY_EXISTS };
    }

    const envelope = encryptSensitiveValue(normNid, {
      purpose: "CUSTOMER_NID",
      customerId,
      recordId: existingIdentity.id,
    });

    const now = new Date();

    const updatedIdentity = await db.customerIdentity.update({
      where: { id: existingIdentity.id },
      data: {
        nidStatus: "SUBMITTED",
        encryptedNidNumber: envelope.ciphertext,
        encryptionIv: envelope.iv,
        authTag: envelope.authTag,
        keyVersion: envelope.keyVersion,
        nidNumberHmac: nidHmac,
        lastFour,
        submittedAt: now,
      },
      select: {
        id: true,
        customerId: true,
        nidStatus: true,
        encryptedNidNumber: true,
        lastFour: true,
        submittedAt: true,
        verifiedAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        verifiedByAdmin: { select: { id: true, name: true } },
      },
    });

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_NID_SUBMITTED",
        entityType: "CustomerIdentity",
        entityId: updatedIdentity.id,
        previousValue: { nidStatus: "PENDING" },
        newValue: { nidStatus: "SUBMITTED" },
      },
      db
    );

    return { success: true, data: mapIdentityToMaskedDTO(updatedIdentity) };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function replaceCustomerNid(
  adminId: string,
  customerId: string,
  rawNid: string,
  expectedUpdatedAt: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerIdentityDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const normNid = normalizeBangladeshNid(rawNid);
    const lastFour = getNidLastFour(normNid);
    const nidHmac = computeNidLookupHmac(normNid);

    const existingIdentity = await db.customerIdentity.findUnique({
      where: { customerId },
    });

    if (!existingIdentity) {
      return { success: false, error: SENSITIVE_ERRORS.IDENTITY_NOT_FOUND };
    }

    if (existingIdentity.updatedAt.toISOString() !== expectedUpdatedAt) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    // Duplicate check: hard-block duplicate NID matching another customer
    const duplicateNidMatch = await db.customerIdentity.findFirst({
      where: {
        nidNumberHmac: nidHmac,
        customerId: { not: customerId },
      },
    });

    if (duplicateNidMatch) {
      return { success: false, error: SENSITIVE_ERRORS.NID_ALREADY_EXISTS };
    }

    const envelope = encryptSensitiveValue(normNid, {
      purpose: "CUSTOMER_NID",
      customerId,
      recordId: existingIdentity.id,
    });

    const now = new Date();

    const updateRes = await db.customerIdentity.updateMany({
      where: {
        id: existingIdentity.id,
        updatedAt: new Date(expectedUpdatedAt),
      },
      data: {
        nidStatus: "SUBMITTED",
        encryptedNidNumber: envelope.ciphertext,
        encryptionIv: envelope.iv,
        authTag: envelope.authTag,
        keyVersion: envelope.keyVersion,
        nidNumberHmac: nidHmac,
        lastFour,
        submittedAt: now,
        verifiedAt: null,
        verifiedByAdminId: null,
      },
    });

    if (updateRes.count !== 1) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updatedIdentity = (await getMaskedCustomerIdentity(customerId, db))!;

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_NID_REPLACED",
        entityType: "CustomerIdentity",
        entityId: existingIdentity.id,
        previousValue: { nidStatus: existingIdentity.nidStatus },
        newValue: { nidStatus: "SUBMITTED" },
      },
      db
    );

    return { success: true, data: updatedIdentity };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function markCustomerNidVerified(
  adminId: string,
  customerId: string,
  expectedUpdatedAt: string,
  notes?: string | null,
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerIdentityDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const existingIdentity = await db.customerIdentity.findUnique({
      where: { customerId },
    });

    if (!existingIdentity) {
      return { success: false, error: SENSITIVE_ERRORS.IDENTITY_NOT_FOUND };
    }

    if (existingIdentity.updatedAt.toISOString() !== expectedUpdatedAt) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    if (!isValidNidStatusTransition(existingIdentity.nidStatus, "VERIFIED")) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_NID_TRANSITION };
    }

    const now = new Date();
    const updateRes = await db.customerIdentity.updateMany({
      where: { id: existingIdentity.id, updatedAt: new Date(expectedUpdatedAt) },
      data: {
        nidStatus: "VERIFIED",
        verifiedAt: now,
        verifiedByAdminId: adminId,
        notes: notes !== undefined ? notes : existingIdentity.notes,
      },
    });

    if (updateRes.count !== 1) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updated = (await getMaskedCustomerIdentity(customerId, db))!;

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_NID_VERIFIED",
        entityType: "CustomerIdentity",
        entityId: existingIdentity.id,
        previousValue: { nidStatus: existingIdentity.nidStatus },
        newValue: { nidStatus: "VERIFIED" },
      },
      db
    );

    return { success: true, data: updated };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function markCustomerNidNeedsCorrection(
  adminId: string,
  customerId: string,
  expectedUpdatedAt: string,
  notes?: string | null,
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerIdentityDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const existingIdentity = await db.customerIdentity.findUnique({
      where: { customerId },
    });

    if (!existingIdentity) {
      return { success: false, error: SENSITIVE_ERRORS.IDENTITY_NOT_FOUND };
    }

    if (existingIdentity.updatedAt.toISOString() !== expectedUpdatedAt) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    if (!isValidNidStatusTransition(existingIdentity.nidStatus, "NEEDS_CORRECTION")) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_NID_TRANSITION };
    }

    const updateRes = await db.customerIdentity.updateMany({
      where: { id: existingIdentity.id, updatedAt: new Date(expectedUpdatedAt) },
      data: {
        nidStatus: "NEEDS_CORRECTION",
        verifiedAt: null,
        verifiedByAdminId: null,
        notes: notes !== undefined ? notes : existingIdentity.notes,
      },
    });

    if (updateRes.count !== 1) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updated = (await getMaskedCustomerIdentity(customerId, db))!;

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_NID_MARKED_NEEDS_CORRECTION",
        entityType: "CustomerIdentity",
        entityId: existingIdentity.id,
        previousValue: { nidStatus: existingIdentity.nidStatus },
        newValue: { nidStatus: "NEEDS_CORRECTION" },
      },
      db
    );

    return { success: true, data: updated };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function revealCustomerNid(
  adminId: string,
  customerId: string,
  passwordInput: string,
  clientIp: string
): Promise<{ success: true; data: SensitiveRevealResult } | { success: false; error: string }> {
  try {
    // 1. Password verification & dual throttle check (DAL session verified by caller)
    await verifyAdminPasswordForReveal(adminId, passwordInput, clientIp, true);

    // 2. Load encrypted record
    const identity = await prisma.customerIdentity.findUnique({
      where: { customerId },
    });

    if (
      !identity ||
      !identity.encryptedNidNumber ||
      !identity.encryptionIv ||
      !identity.authTag ||
      !identity.keyVersion
    ) {
      return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
    }

    // 3. Decrypt with canonical AAD
    const plaintextNid = decryptSensitiveValue(
      {
        ciphertext: identity.encryptedNidNumber,
        iv: identity.encryptionIv,
        authTag: identity.authTag,
        keyVersion: identity.keyVersion,
      },
      {
        purpose: "CUSTOMER_NID",
        customerId: identity.customerId,
        recordId: identity.id,
      }
    );

    const nowIso = new Date().toISOString();

    // 4. Fail-closed Audit Write Step: MUST succeed before returning plaintext!
    try {
      await logSensitiveAuditEvent({
        adminUserId: adminId,
        action: "CUSTOMER_NID_REVEALED",
        entityType: "CustomerIdentity",
        entityId: identity.id,
        ipAddress: clientIp,
      });
    } catch {
      // Audit write failed -> ABORT reveal immediately and return NO plaintext!
      return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
    }

    // 5. Return plaintext only after audit write succeeds
    return {
      success: true,
      data: {
        plaintext: plaintextNid,
        revealedAt: nowIso,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

// -----------------------------------------------------------------------------
// BANK ACCOUNT DOMAIN SERVICES
// -----------------------------------------------------------------------------

export async function listMaskedCustomerBankAccounts(
  customerId: string,
  tx?: Prisma.TransactionClient
): Promise<MaskedCustomerBankAccountDTO[]> {
  const db = tx ?? prisma;
  const accounts = await db.customerBankAccount.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerId: true,
      bankName: true,
      accountHolderName: true,
      branchName: true,
      accountNumberLastFour: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return accounts.map(mapBankAccountToMaskedDTO);
}

export async function createCustomerBankAccount(
  adminId: string,
  customerId: string,
  input: {
    bankName: string;
    accountHolderName: string;
    branchName?: string | null;
    accountNumber: string;
  },
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const normAccount = normalizeBankAccountNumber(input.accountNumber);
    const lastFour = getBankAccountLastFour(normAccount);

    // Verify customer exists
    const customer = await db.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) {
      return { success: false, error: SENSITIVE_ERRORS.CUSTOMER_NOT_FOUND };
    }

    // Rule 2: Pre-generate UUID for record ID before encryption
    const bankAccountId = crypto.randomUUID();

    const envelope = encryptSensitiveValue(normAccount, {
      purpose: "CUSTOMER_BANK_ACCOUNT_NUMBER",
      customerId,
      recordId: bankAccountId,
    });

    const newAccount = await db.customerBankAccount.create({
      data: {
        id: bankAccountId, // Pre-generated UUID used in AAD
        customerId,
        bankName: input.bankName.trim(),
        accountHolderName: input.accountHolderName.trim(),
        branchName: input.branchName ? input.branchName.trim() : null,
        encryptedAccountNumber: envelope.ciphertext,
        encryptionIv: envelope.iv,
        authTag: envelope.authTag,
        keyVersion: envelope.keyVersion,
        accountNumberLastFour: lastFour,
        isActive: true,
      },
      select: {
        id: true,
        customerId: true,
        bankName: true,
        accountHolderName: true,
        branchName: true,
        accountNumberLastFour: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_BANK_ACCOUNT_CREATED",
        entityType: "CustomerBankAccount",
        entityId: newAccount.id,
        newValue: { bankName: newAccount.bankName },
      },
      db
    );

    return { success: true, data: mapBankAccountToMaskedDTO(newAccount) };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function updateCustomerBankAccountMetadata(
  adminId: string,
  bankAccountId: string,
  input: {
    bankName: string;
    accountHolderName: string;
    branchName?: string | null;
    expectedUpdatedAt: string;
  },
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const existing = await db.customerBankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!existing) {
      return { success: false, error: SENSITIVE_ERRORS.BANK_ACCOUNT_NOT_FOUND };
    }

    if (existing.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updateRes = await db.customerBankAccount.updateMany({
      where: { id: bankAccountId, updatedAt: new Date(input.expectedUpdatedAt) },
      data: {
        bankName: input.bankName.trim(),
        accountHolderName: input.accountHolderName.trim(),
        branchName: input.branchName ? input.branchName.trim() : null,
      },
    });

    if (updateRes.count !== 1) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updated = await db.customerBankAccount.findUnique({
      where: { id: bankAccountId },
      select: {
        id: true,
        customerId: true,
        bankName: true,
        accountHolderName: true,
        branchName: true,
        accountNumberLastFour: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_BANK_ACCOUNT_METADATA_UPDATED",
        entityType: "CustomerBankAccount",
        entityId: bankAccountId,
        previousValue: { bankName: existing.bankName },
        newValue: { bankName: updated!.bankName },
      },
      db
    );

    return { success: true, data: mapBankAccountToMaskedDTO(updated!) };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function replaceCustomerBankAccountNumber(
  adminId: string,
  bankAccountId: string,
  newRawAccountNumber: string,
  expectedUpdatedAt: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const normAccount = normalizeBankAccountNumber(newRawAccountNumber);
    const lastFour = getBankAccountLastFour(normAccount);

    const existing = await db.customerBankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!existing) {
      return { success: false, error: SENSITIVE_ERRORS.BANK_ACCOUNT_NOT_FOUND };
    }

    if (existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const envelope = encryptSensitiveValue(normAccount, {
      purpose: "CUSTOMER_BANK_ACCOUNT_NUMBER",
      customerId: existing.customerId,
      recordId: existing.id,
    });

    const updateRes = await db.customerBankAccount.updateMany({
      where: { id: bankAccountId, updatedAt: new Date(expectedUpdatedAt) },
      data: {
        encryptedAccountNumber: envelope.ciphertext,
        encryptionIv: envelope.iv,
        authTag: envelope.authTag,
        keyVersion: envelope.keyVersion,
        accountNumberLastFour: lastFour,
      },
    });

    if (updateRes.count !== 1) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updated = await db.customerBankAccount.findUnique({
      where: { id: bankAccountId },
      select: {
        id: true,
        customerId: true,
        bankName: true,
        accountHolderName: true,
        branchName: true,
        accountNumberLastFour: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_BANK_ACCOUNT_NUMBER_REPLACED",
        entityType: "CustomerBankAccount",
        entityId: bankAccountId,
      },
      db
    );

    return { success: true, data: mapBankAccountToMaskedDTO(updated!) };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function archiveCustomerBankAccount(
  adminId: string,
  bankAccountId: string,
  expectedUpdatedAt: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const existing = await db.customerBankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!existing) {
      return { success: false, error: SENSITIVE_ERRORS.BANK_ACCOUNT_NOT_FOUND };
    }

    if (!existing.isActive) {
      return { success: false, error: SENSITIVE_ERRORS.ALREADY_ARCHIVED };
    }

    if (existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updateRes = await db.customerBankAccount.updateMany({
      where: { id: bankAccountId, isActive: true, updatedAt: new Date(expectedUpdatedAt) },
      data: { isActive: false },
    });

    if (updateRes.count !== 1) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updated = await db.customerBankAccount.findUnique({
      where: { id: bankAccountId },
      select: {
        id: true,
        customerId: true,
        bankName: true,
        accountHolderName: true,
        branchName: true,
        accountNumberLastFour: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_BANK_ACCOUNT_ARCHIVED",
        entityType: "CustomerBankAccount",
        entityId: bankAccountId,
      },
      db
    );

    return { success: true, data: mapBankAccountToMaskedDTO(updated!) };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function restoreCustomerBankAccount(
  adminId: string,
  bankAccountId: string,
  expectedUpdatedAt: string,
  tx?: Prisma.TransactionClient
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const db = tx ?? prisma;
    const existing = await db.customerBankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!existing) {
      return { success: false, error: SENSITIVE_ERRORS.BANK_ACCOUNT_NOT_FOUND };
    }

    if (existing.isActive) {
      return { success: false, error: SENSITIVE_ERRORS.ALREADY_ACTIVE };
    }

    if (existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updateRes = await db.customerBankAccount.updateMany({
      where: { id: bankAccountId, isActive: false, updatedAt: new Date(expectedUpdatedAt) },
      data: { isActive: true },
    });

    if (updateRes.count !== 1) {
      return { success: false, error: SENSITIVE_ERRORS.CONCURRENCY_CONFLICT };
    }

    const updated = await db.customerBankAccount.findUnique({
      where: { id: bankAccountId },
      select: {
        id: true,
        customerId: true,
        bankName: true,
        accountHolderName: true,
        branchName: true,
        accountNumberLastFour: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logSensitiveAuditEvent(
      {
        adminUserId: adminId,
        action: "CUSTOMER_BANK_ACCOUNT_RESTORED",
        entityType: "CustomerBankAccount",
        entityId: bankAccountId,
      },
      db
    );

    return { success: true, data: mapBankAccountToMaskedDTO(updated!) };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}

export async function revealCustomerBankAccountNumber(
  adminId: string,
  bankAccountId: string,
  passwordInput: string,
  clientIp: string
): Promise<{ success: true; data: SensitiveRevealResult } | { success: false; error: string }> {
  try {
    // 1. Password verification & dual throttle check (DAL session verified by caller)
    await verifyAdminPasswordForReveal(adminId, passwordInput, clientIp, true);

    // 2. Load encrypted record
    const account = await prisma.customerBankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (
      !account ||
      !account.encryptedAccountNumber ||
      !account.encryptionIv ||
      !account.authTag ||
      !account.keyVersion
    ) {
      return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
    }

    // 3. Decrypt with canonical AAD
    const plaintextAccount = decryptSensitiveValue(
      {
        ciphertext: account.encryptedAccountNumber,
        iv: account.encryptionIv,
        authTag: account.authTag,
        keyVersion: account.keyVersion,
      },
      {
        purpose: "CUSTOMER_BANK_ACCOUNT_NUMBER",
        customerId: account.customerId,
        recordId: account.id,
      }
    );

    const nowIso = new Date().toISOString();

    // 4. Fail-closed Audit Write Step: MUST succeed before returning plaintext!
    try {
      await logSensitiveAuditEvent({
        adminUserId: adminId,
        action: "CUSTOMER_BANK_ACCOUNT_REVEALED",
        entityType: "CustomerBankAccount",
        entityId: account.id,
        ipAddress: clientIp,
      });
    } catch {
      // Audit write failed -> ABORT reveal immediately and return NO plaintext!
      return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
    }

    // 5. Return plaintext only after audit write succeeds
    return {
      success: true,
      data: {
        plaintext: plaintextAccount,
        revealedAt: nowIso,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Error && Object.values(SENSITIVE_ERRORS).includes(err.message as typeof SENSITIVE_ERRORS[keyof typeof SENSITIVE_ERRORS])) {
      return { success: false, error: err.message };
    }
    return { success: false, error: SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE };
  }
}
