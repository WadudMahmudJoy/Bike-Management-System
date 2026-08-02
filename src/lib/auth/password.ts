import "server-only";
import * as argon2 from "argon2";
import { z } from "zod";
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  ARGON2_MEMORY_COST,
  ARGON2_TIME_COST,
  ARGON2_PARALLELISM,
} from "./constants";

/**
 * Argon2id hashing options.
 * Sourced from constants.ts (single source of truth).
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: ARGON2_MEMORY_COST,
  timeCost: ARGON2_TIME_COST,
  parallelism: ARGON2_PARALLELISM,
};

/**
 * Precomputed Argon2id dummy hash for constant-work unknown-account path.
 * Generated from a random non-secret value using the same Argon2id parameters.
 * This is NOT a credential — it exists solely to prevent timing-based account enumeration.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$8RwZqn8CO4DA5cJ99pce3A$eAcXX4FtU+rI+HPIqjFewFXxyJb2QXJMeHD3nMyewso";

/**
 * Password policy validation schema.
 * - 12–128 characters
 * - Spaces and Unicode allowed
 * - Empty and whitespace-only rejected
 * - No arbitrary composition rules
 * - No silent truncation
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(MAX_PASSWORD_LENGTH, `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`)
  .refine(
    (val) => val.trim().length > 0,
    "Password cannot be empty or whitespace-only.",
  );

/**
 * Hash a plaintext password using Argon2id.
 * Never logs or returns the plaintext.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against an Argon2id hash.
 * Returns true if the password matches, false otherwise.
 */
export async function verifyPassword(
  hash: string,
  plaintext: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}

/**
 * Constant-work verification for nonexistent accounts.
 * Verifies against a dummy hash to prevent timing-based account enumeration.
 * Always returns false — the purpose is CPU-time parity with real verification.
 */
export async function verifyAgainstDummy(plaintext: string): Promise<boolean> {
  try {
    await argon2.verify(DUMMY_HASH, plaintext);
  } catch {
    // Expected to fail — the point is to consume the same CPU time
  }
  return false;
}

/**
 * Validate a password against the password policy.
 * Returns an object with `valid` boolean and optional `error` message.
 */
export function validatePasswordPolicy(password: string): {
  valid: boolean;
  error?: string;
} {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return {
      valid: false,
      error: result.error.issues[0]?.message ?? "Invalid password.",
    };
  }
  return { valid: true };
}
