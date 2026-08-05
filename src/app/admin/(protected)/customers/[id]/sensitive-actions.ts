"use server";

import { requireAdmin } from "@/lib/auth/dal";
import { getClientAddress } from "@/lib/auth/client-address";
import {
  submitNidSchema,
  replaceNidSchema,
  nidStatusActionSchema,
  createBankAccountSchema,
  updateBankAccountMetadataSchema,
  replaceBankAccountNumberSchema,
  bankAccountStatusSchema,
  sensitiveRevealSchema,
} from "@/lib/sensitive-data/validation";
import {
  submitCustomerNid,
  replaceCustomerNid,
  markCustomerNidVerified,
  markCustomerNidNeedsCorrection,
  revealCustomerNid,
  createCustomerBankAccount,
  updateCustomerBankAccountMetadata,
  replaceCustomerBankAccountNumber,
  archiveCustomerBankAccount,
  restoreCustomerBankAccount,
  revealCustomerBankAccountNumber,
} from "@/lib/sensitive-data/service";
import { SENSITIVE_ERRORS } from "@/lib/sensitive-data/errors";
import type {
  MaskedCustomerIdentityDTO,
  MaskedCustomerBankAccountDTO,
  SensitiveRevealResult,
} from "@/lib/sensitive-data/types";

export async function submitCustomerNidAction(
  customerId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerIdentityDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = submitNidSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await submitCustomerNid(admin.id, customerId, parsed.data.nidNumber);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function replaceCustomerNidAction(
  customerId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerIdentityDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = replaceNidSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await replaceCustomerNid(
      admin.id,
      customerId,
      parsed.data.nidNumber,
      parsed.data.expectedUpdatedAt
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function markCustomerNidVerifiedAction(
  customerId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerIdentityDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = nidStatusActionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await markCustomerNidVerified(
      admin.id,
      customerId,
      parsed.data.expectedUpdatedAt,
      parsed.data.notes
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function markCustomerNidNeedsCorrectionAction(
  customerId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerIdentityDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = nidStatusActionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await markCustomerNidNeedsCorrection(
      admin.id,
      customerId,
      parsed.data.expectedUpdatedAt,
      parsed.data.notes
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function revealCustomerNidAction(
  customerId: string,
  rawInput: unknown
): Promise<{ success: true; data: SensitiveRevealResult } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const clientIp = await getClientAddress();
    const parsed = sensitiveRevealSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await revealCustomerNid(admin.id, customerId, parsed.data.password, clientIp);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function createCustomerBankAccountAction(
  customerId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = createBankAccountSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await createCustomerBankAccount(admin.id, customerId, parsed.data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function updateCustomerBankAccountMetadataAction(
  bankAccountId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = updateBankAccountMetadataSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await updateCustomerBankAccountMetadata(admin.id, bankAccountId, parsed.data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function replaceCustomerBankAccountNumberAction(
  bankAccountId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = replaceBankAccountNumberSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await replaceCustomerBankAccountNumber(
      admin.id,
      bankAccountId,
      parsed.data.accountNumber,
      parsed.data.expectedUpdatedAt
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function archiveCustomerBankAccountAction(
  bankAccountId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = bankAccountStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await archiveCustomerBankAccount(
      admin.id,
      bankAccountId,
      parsed.data.expectedUpdatedAt
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function restoreCustomerBankAccountAction(
  bankAccountId: string,
  rawInput: unknown
): Promise<{ success: true; data: MaskedCustomerBankAccountDTO } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const parsed = bankAccountStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await restoreCustomerBankAccount(
      admin.id,
      bankAccountId,
      parsed.data.expectedUpdatedAt
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}

export async function revealCustomerBankAccountNumberAction(
  bankAccountId: string,
  rawInput: unknown
): Promise<{ success: true; data: SensitiveRevealResult } | { success: false; error: string }> {
  try {
    const admin = await requireAdmin();
    const clientIp = await getClientAddress();
    const parsed = sensitiveRevealSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: SENSITIVE_ERRORS.INVALID_INPUT };
    }
    return await revealCustomerBankAccountNumber(admin.id, bankAccountId, parsed.data.password, clientIp);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE;
    return { success: false, error: msg };
  }
}
