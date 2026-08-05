import { z } from "zod";
import { validateBangladeshNid } from "./nid";
import { validateBankAccountNumber } from "./bank-account";

export const submitNidSchema = z
  .object({
    nidNumber: z
      .string()
      .trim()
      .min(1, "NID number is required.")
      .refine((val) => validateBangladeshNid(val), {
        message: "Invalid Bangladesh NID number format (must be 10, 13, or 17 digits).",
      }),
  })
  .strict();

export const replaceNidSchema = z
  .object({
    nidNumber: z
      .string()
      .trim()
      .min(1, "NID number is required.")
      .refine((val) => validateBangladeshNid(val), {
        message: "Invalid Bangladesh NID number format (must be 10, 13, or 17 digits).",
      }),
    expectedUpdatedAt: z
      .string()
      .datetime({ message: "A valid ISO expectedUpdatedAt timestamp is required." }),
  })
  .strict();

export const nidStatusActionSchema = z
  .object({
    notes: z.string().trim().max(1000).optional().nullable(),
    expectedUpdatedAt: z
      .string()
      .datetime({ message: "A valid ISO expectedUpdatedAt timestamp is required." }),
  })
  .strict();

export const createBankAccountSchema = z
  .object({
    bankName: z.string().trim().min(1, "Bank name is required.").max(255),
    accountHolderName: z.string().trim().min(1, "Account holder name is required.").max(255),
    branchName: z
      .string()
      .trim()
      .max(255)
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    accountNumber: z
      .string()
      .trim()
      .min(1, "Account number is required.")
      .refine((val) => validateBankAccountNumber(val), {
        message: "Invalid bank account number format (must contain 6 to 34 digits).",
      }),
  })
  .strict();

export const updateBankAccountMetadataSchema = z
  .object({
    bankName: z.string().trim().min(1, "Bank name is required.").max(255),
    accountHolderName: z.string().trim().min(1, "Account holder name is required.").max(255),
    branchName: z
      .string()
      .trim()
      .max(255)
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
    expectedUpdatedAt: z
      .string()
      .datetime({ message: "A valid ISO expectedUpdatedAt timestamp is required." }),
  })
  .strict();

export const replaceBankAccountNumberSchema = z
  .object({
    accountNumber: z
      .string()
      .trim()
      .min(1, "Account number is required.")
      .refine((val) => validateBankAccountNumber(val), {
        message: "Invalid bank account number format (must contain 6 to 34 digits).",
      }),
    expectedUpdatedAt: z
      .string()
      .datetime({ message: "A valid ISO expectedUpdatedAt timestamp is required." }),
  })
  .strict();

export const bankAccountStatusSchema = z
  .object({
    expectedUpdatedAt: z
      .string()
      .datetime({ message: "A valid ISO expectedUpdatedAt timestamp is required." }),
  })
  .strict();

export const sensitiveRevealSchema = z
  .object({
    password: z
      .string()
      .min(1, "Current admin password is required for sensitive reveal.")
      .max(128, "Password length exceeds maximum allowed limit."),
  })
  .strict();
