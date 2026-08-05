import { z } from "zod";

/**
 * Normalizes a Bangladesh mobile number to canonical format: +8801XXXXXXXXX
 * Accepts:
 * - 01XXXXXXXXX (11 digits)
 * - 8801XXXXXXXXX (13 digits)
 * - +8801XXXXXXXXX (14 characters)
 * Harmless spaces, dashes, and parentheses are stripped before parsing.
 * Returns null if the input is invalid.
 */
export function normalizeBangladeshPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Remove spaces, hyphens, parentheses
  const cleaned = trimmed.replace(/[\s\-\(\)]/g, "");

  // +8801[3-9]\d{8}
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  // 8801[3-9]\d{8}
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  // 01[3-9]\d{8}
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `+88${cleaned}`;
  }

  return null;
}

/**
 * Safely masks a phone number for display in non-privileged contexts.
 * Format for BD normalized +8801712345678 -> "+880 17***-**78"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const normalized = normalizeBangladeshPhone(phone) ?? phone.trim();

  if (normalized.startsWith("+8801") && normalized.length === 14) {
    const operator = normalized.substring(4, 6); // e.g. "17"
    const lastTwo = normalized.substring(12);    // e.g. "78"
    return `+880 ${operator}***-**${lastTwo}`;
  }

  if (normalized.length > 6) {
    const start = normalized.substring(0, 4);
    const end = normalized.substring(normalized.length - 2);
    const maskedLen = Math.max(3, normalized.length - 6);
    return `${start}${"*".repeat(maskedLen)}${end}`;
  }

  return "***";
}

/**
 * Zod schema for Bangladesh mobile numbers.
 */
export const bdPhoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine(
    (val) => normalizeBangladeshPhone(val) !== null,
    "Invalid Bangladesh mobile number. Must be a valid 11-digit mobile number (e.g. 01712345678)."
  );

/**
 * Zod schema for optional Bangladesh mobile numbers (e.g. WhatsApp).
 */
export const optionalBdPhoneSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => !val || val.trim() === "" || normalizeBangladeshPhone(val) !== null,
    "Invalid Bangladesh mobile number format."
  );
