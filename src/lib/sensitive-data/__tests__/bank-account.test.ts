import { describe, it, expect } from "vitest";
import {
  normalizeBankAccountNumber,
  validateBankAccountNumber,
  maskBankAccountNumber,
  getBankAccountLastFour,
} from "../bank-account";

describe("Bank Account Number Utilities", () => {
  it("normalizes valid account numbers", () => {
    const raw = " 1234-5678-9012 ";
    expect(normalizeBankAccountNumber(raw)).toBe("123456789012");
    expect(validateBankAccountNumber(raw)).toBe(true);
  });

  it("rejects numbers shorter than 6 digits", () => {
    expect(validateBankAccountNumber("12345")).toBe(false);
  });

  it("rejects numbers longer than 34 digits", () => {
    const overlong = "1".repeat(35);
    expect(validateBankAccountNumber(overlong)).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(validateBankAccountNumber("123456789A")).toBe(false);
    expect(validateBankAccountNumber("ACCT-123456")).toBe(false);
  });

  it("masks account number exposing only final 4 digits", () => {
    expect(maskBankAccountNumber("123456789012")).toBe("******9012");
    expect(getBankAccountLastFour("123456789012")).toBe("9012");
  });
});
