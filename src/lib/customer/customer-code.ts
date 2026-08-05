import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Crockford Base32 32-character unambiguous alphabet (excludes I, L, O, U)
const BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generates an 8-character string from the unambiguous Crockford Base32 alphabet.
 */
export function generateRandomCodeSegment(): string {
  const bytes = crypto.randomBytes(8);
  let result = "";
  for (let i = 0; i < 8; i++) {
    const randomIndex = bytes[i] % BASE32_ALPHABET.length;
    result += BASE32_ALPHABET[randomIndex];
  }
  return result;
}

/**
 * Generates a unique, immutable customer code in CUS-XXXXXXXX format.
 * Includes a bounded collision retry loop (up to 5 attempts).
 */
export async function generateCustomerCode(
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<string> {
  const client = tx ?? prisma;
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = `CUS-${generateRandomCodeSegment()}`;
    const existing = await client.customer.findUnique({
      where: { customerCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate unique customer code. Please try again.");
}
