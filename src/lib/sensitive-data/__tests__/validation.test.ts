import { describe, it, expect } from "vitest";
import {
  submitNidSchema,
  createBankAccountSchema,
  updateBankAccountMetadataSchema,
  replaceBankAccountNumberSchema,
  sensitiveRevealSchema,
} from "../validation";

describe("Sensitive Data Input Boundary Validation (Strict Zod Schemas)", () => {
  it("validates valid submit NID payload", () => {
    const res = submitNidSchema.safeParse({ nidNumber: "19901234567890123" });
    expect(res.success).toBe(true);
  });

  it("rejects unexpected fields in submit NID payload due to .strict()", () => {
    const res = submitNidSchema.safeParse({
      nidNumber: "19901234567890123",
      adminId: "malicious-admin-id",
      encryptedNidNumber: "tampered-ciphertext",
      nidNumberHmac: "fake-hmac",
      lastFour: "1234",
    });
    expect(res.success).toBe(false);
  });

  it("validates valid create bank account payload", () => {
    const res = createBankAccountSchema.safeParse({
      bankName: "Dutch-Bangla Bank",
      accountHolderName: "Sristy-Dristy Enterprise",
      branchName: "Mirpur Branch",
      accountNumber: "123456789012",
    });
    expect(res.success).toBe(true);
  });

  it("rejects unexpected bank account fields (routingNumber, mobileBankingProvider, mobileBankingNumber, isDefault)", () => {
    const testFields = [
      { routingNumber: "123456789" },
      { mobileBankingProvider: "bKash" },
      { mobileBankingNumber: "01711223344" },
      { isDefault: true },
      { encryptedAccountNumber: "ciphertext" },
      { encryptionIv: "iv" },
      { authTag: "tag" },
      { keyVersion: 1 },
      { accountNumberLastFour: "9012" },
      { adminId: "fake-admin" },
    ];

    testFields.forEach((field) => {
      const payload = {
        bankName: "Dutch-Bangla Bank",
        accountHolderName: "Sristy-Dristy Enterprise",
        accountNumber: "123456789012",
        ...field,
      };
      const res = createBankAccountSchema.safeParse(payload);
      expect(res.success).toBe(false);
    });
  });

  it("rejects unexpected fields in update metadata and replace number schemas", () => {
    const metaRes = updateBankAccountMetadataSchema.safeParse({
      bankName: "BRAC Bank",
      accountHolderName: "Sristy-Dristy Enterprise",
      expectedUpdatedAt: new Date().toISOString(),
      encryptedAccountNumber: "tampered",
    });
    expect(metaRes.success).toBe(false);

    const replaceRes = replaceBankAccountNumberSchema.safeParse({
      accountNumber: "987654321098",
      expectedUpdatedAt: new Date().toISOString(),
      routingNumber: "123",
    });
    expect(replaceRes.success).toBe(false);
  });

  it("validates reveal schema and rejects extra parameters", () => {
    const valid = sensitiveRevealSchema.safeParse({ password: "adminPassword123!" });
    expect(valid.success).toBe(true);

    const invalid = sensitiveRevealSchema.safeParse({
      password: "adminPassword123!",
      sessionToken: "stolen-token",
    });
    expect(invalid.success).toBe(false);
  });
});
