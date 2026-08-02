import "server-only";
import { z } from "zod";

/**
 * Zod schema for validating email format.
 * Does not perform provider-specific transformations.
 */
export const emailSchema = z.string().email("Invalid email address.");

/**
 * Normalize an email address for canonical storage and lookup.
 * - Trims surrounding whitespace
 * - Converts to lowercase deterministically
 * - Does not perform provider-specific transformations (e.g., Gmail dot stripping)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validate and normalize an email address.
 * Returns the normalized email on success, or null on validation failure.
 * Does not reveal whether an account exists.
 */
export function validateAndNormalizeEmail(email: string): string | null {
  const trimmed = email.trim();
  const result = emailSchema.safeParse(trimmed);
  if (!result.success) {
    return null;
  }
  return normalizeEmail(result.data);
}
