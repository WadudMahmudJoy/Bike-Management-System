import "server-only";
import crypto from "node:crypto";
import { getActiveKeyVersion, getEncryptionKey } from "./config";
import { SENSITIVE_ERRORS } from "./errors";
import type { SensitiveEncryptionContext, EncryptedEnvelope } from "./types";

export function buildCanonicalAad(context: SensitiveEncryptionContext): string {
  if (!context || !context.purpose || !context.customerId || !context.recordId) {
    throw new Error(SENSITIVE_ERRORS.INVALID_INPUT);
  }
  return `bike-management-system|sensitive:v1|${context.purpose}|customer:${context.customerId}|record:${context.recordId}`;
}

export function encryptSensitiveValue(
  plaintext: string,
  context: SensitiveEncryptionContext
): EncryptedEnvelope {
  if (typeof plaintext !== "string" || !plaintext) {
    throw new Error(SENSITIVE_ERRORS.INVALID_INPUT);
  }

  const keyVersion = getActiveKeyVersion();
  const keyBuffer = getEncryptionKey(keyVersion);

  // Fresh 12-byte (96-bit) IV for GCM
  const ivBuffer = crypto.randomBytes(12);
  const aadString = buildCanonicalAad(context);

  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, ivBuffer);
  cipher.setAAD(Buffer.from(aadString, "utf8"));

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const authTagBuffer = cipher.getAuthTag();

  return {
    ciphertext,
    iv: ivBuffer.toString("base64"),
    authTag: authTagBuffer.toString("base64"),
    keyVersion,
  };
}

export function decryptSensitiveValue(
  envelope: EncryptedEnvelope,
  context: SensitiveEncryptionContext
): string {
  if (
    !envelope ||
    !envelope.ciphertext ||
    !envelope.iv ||
    !envelope.authTag ||
    !envelope.keyVersion
  ) {
    throw new Error(SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE);
  }

  try {
    const keyBuffer = getEncryptionKey(envelope.keyVersion);
    const ivBuffer = Buffer.from(envelope.iv, "base64");
    const authTagBuffer = Buffer.from(envelope.authTag, "base64");

    if (ivBuffer.length !== 12 || authTagBuffer.length !== 16) {
      throw new Error(SENSITIVE_ERRORS.SENSITIVE_DATA_INTEGRITY_ERROR);
    }

    const aadString = buildCanonicalAad(context);

    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, ivBuffer);
    decipher.setAuthTag(authTagBuffer);
    decipher.setAAD(Buffer.from(aadString, "utf8"));

    let plaintext = decipher.update(envelope.ciphertext, "base64", "utf8");
    plaintext += decipher.final("utf8");

    return plaintext;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message === SENSITIVE_ERRORS.INVALID_INPUT ||
        err.message === SENSITIVE_ERRORS.SENSITIVE_DATA_UNAVAILABLE)
    ) {
      throw err;
    }
    // Fail closed on any decryption or GCM tag authentication failure
    throw new Error(SENSITIVE_ERRORS.SENSITIVE_DATA_INTEGRITY_ERROR);
  }
}
