import "server-only";
import crypto from "node:crypto";

function isCanonicalBase64(str: string): boolean {
  if (typeof str !== "string" || !str) return false;
  // Strict Base64 character set check
  if (!/^[A-Za-z0-9+/=]+$/.test(str)) return false;
  try {
    const buf = Buffer.from(str, "base64");
    return buf.toString("base64") === str;
  } catch {
    return false;
  }
}

export function getActiveKeyVersion(): number {
  const versionStr = process.env.SENSITIVE_DATA_ACTIVE_KEY_VERSION ?? "1";
  const version = parseInt(versionStr, 10);
  if (isNaN(version) || version < 1) {
    throw new Error("Invalid or unconfigured active encryption key version.");
  }
  return version;
}

export function getEncryptionKey(version: number): Buffer {
  if (!version || version < 1) {
    throw new Error("Invalid encryption key version requested.");
  }
  const keyEnvVar = `SENSITIVE_DATA_ENCRYPTION_KEY_V${version}`;
  const rawKey = process.env[keyEnvVar];

  if (!rawKey || !isCanonicalBase64(rawKey)) {
    throw new Error(`Encryption key version ${version} is missing or not valid canonical Base64.`);
  }

  const keyBuffer = Buffer.from(rawKey, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error(`Encryption key version ${version} must be exactly 32 bytes (256 bits).`);
  }

  return keyBuffer;
}

export function getHmacLookupKey(): Buffer {
  const rawKey = process.env.SENSITIVE_DATA_LOOKUP_HMAC_KEY;

  if (!rawKey || !isCanonicalBase64(rawKey)) {
    throw new Error("Lookup HMAC key is missing or not valid canonical Base64.");
  }

  const hmacKeyBuffer = Buffer.from(rawKey, "base64");
  if (hmacKeyBuffer.length !== 32) {
    throw new Error("Lookup HMAC key must be exactly 32 bytes (256 bits).");
  }

  // Ensure active encryption key and HMAC key are different
  try {
    const activeVer = getActiveKeyVersion();
    const activeEncKey = getEncryptionKey(activeVer);
    if (crypto.timingSafeEqual(activeEncKey, hmacKeyBuffer)) {
      throw new Error("Encryption key and lookup HMAC key must be different.");
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("must be different")) {
      throw err;
    }
    // Ignore active key fetch error if testing HMAC in isolation
  }

  return hmacKeyBuffer;
}
