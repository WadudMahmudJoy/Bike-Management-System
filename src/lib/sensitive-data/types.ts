import type { NidStatus } from "@/generated/prisma/client";

export type SensitiveEncryptionPurpose =
  | "CUSTOMER_NID"
  | "CUSTOMER_BANK_ACCOUNT_NUMBER";

export interface SensitiveEncryptionContext {
  purpose: SensitiveEncryptionPurpose;
  customerId: string;
  recordId: string;
}

export interface EncryptedEnvelope {
  ciphertext: string; // Base64
  iv: string;         // Base64 (12 bytes)
  authTag: string;    // Base64 (16 bytes)
  keyVersion: number; // e.g. 1
}

export interface MaskedCustomerIdentityDTO {
  id: string;
  customerId: string;
  nidStatus: NidStatus;
  maskedNid: string | null; // e.g. "******1234" or null if PENDING
  hasEncryptedData: boolean;
  submittedAt: string | null;
  verifiedAt: string | null;
  verifiedByAdmin: {
    id: string;
    name: string;
  } | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaskedCustomerBankAccountDTO {
  id: string;
  customerId: string;
  bankName: string;
  accountHolderName: string;
  branchName: string | null;
  maskedAccountNumber: string; // e.g. "******5678"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SensitiveRevealResult {
  plaintext: string;
  revealedAt: string;
}
