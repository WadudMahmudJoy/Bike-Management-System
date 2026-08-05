import { SENSITIVE_ERRORS } from "./errors";

export function normalizeBankAccountNumber(rawAccountNumber: string): string {
  if (typeof rawAccountNumber !== "string" || !rawAccountNumber) {
    throw new Error(SENSITIVE_ERRORS.INVALID_INPUT);
  }

  // Trim and remove spaces and hyphens
  const cleaned = rawAccountNumber.trim().replace(/[\s-]/g, "");

  // Must consist solely of ASCII digits
  if (!/^\d+$/.test(cleaned)) {
    throw new Error(SENSITIVE_ERRORS.INVALID_INPUT);
  }

  // Minimum 6 digits, maximum 34 digits (IBAN max 34)
  if (cleaned.length < 6 || cleaned.length > 34) {
    throw new Error(SENSITIVE_ERRORS.INVALID_INPUT);
  }

  return cleaned;
}

export function validateBankAccountNumber(rawAccountNumber: string): boolean {
  try {
    normalizeBankAccountNumber(rawAccountNumber);
    return true;
  } catch {
    return false;
  }
}

export function maskBankAccountNumber(normalizedAccountNumber: string): string {
  const norm = normalizeBankAccountNumber(normalizedAccountNumber);
  const lastFour = norm.slice(-4);
  return `******${lastFour}`;
}

export function getBankAccountLastFour(normalizedAccountNumber: string): string {
  const norm = normalizeBankAccountNumber(normalizedAccountNumber);
  return norm.slice(-4);
}
