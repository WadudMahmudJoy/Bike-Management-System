import { describe, it, expect, beforeEach } from "vitest";
import {
  getActiveKeyVersion,
  getEncryptionKey,
  getHmacLookupKey,
} from "../config";
import {
  encryptSensitiveValue,
  decryptSensitiveValue,
} from "../crypto";
import { SENSITIVE_ERRORS } from "../errors";

describe("AES-256-GCM Sensitive Data Encryption & Key Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set valid 32-byte Base64 keys for testing
    process.env.SENSITIVE_DATA_ACTIVE_KEY_VERSION = "1";
    process.env.SENSITIVE_DATA_ENCRYPTION_KEY_V1 = Buffer.alloc(32, "a").toString("base64");
    process.env.SENSITIVE_DATA_LOOKUP_HMAC_KEY = Buffer.alloc(32, "b").toString("base64");
  });

  describe("Config & Key Parsing", () => {
    it("parses valid active key version", () => {
      expect(getActiveKeyVersion()).toBe(1);
    });

    it("returns 32-byte Buffer for valid Base64 key", () => {
      const key = getEncryptionKey(1);
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it("throws error for non-canonical or malformed Base64 key", () => {
      process.env.SENSITIVE_DATA_ENCRYPTION_KEY_V1 = "not-valid-base64!!!";
      expect(() => getEncryptionKey(1)).toThrow("missing or not valid canonical Base64");
    });

    it("throws error if decoded key is not 32 bytes", () => {
      // 16 bytes encoded in Base64
      process.env.SENSITIVE_DATA_ENCRYPTION_KEY_V1 = Buffer.alloc(16, "a").toString("base64");
      expect(() => getEncryptionKey(1)).toThrow("must be exactly 32 bytes");
    });

    it("rejects identical encryption and HMAC keys", () => {
      const sameKey = Buffer.alloc(32, "x").toString("base64");
      process.env.SENSITIVE_DATA_ENCRYPTION_KEY_V1 = sameKey;
      process.env.SENSITIVE_DATA_LOOKUP_HMAC_KEY = sameKey;

      expect(() => getHmacLookupKey()).toThrow("Encryption key and lookup HMAC key must be different");
    });
  });

  describe("AES-256-GCM Encryption & Decryption", () => {
    const testContext = {
      purpose: "CUSTOMER_NID" as const,
      customerId: "10ca7005-5f02-4919-8384-8f743ad2096b",
      recordId: "rec-123456",
    };

    it("performs encrypt/decrypt round trip for plaintext", () => {
      const plaintext = "19901234567890123";
      const envelope = encryptSensitiveValue(plaintext, testContext);

      expect(envelope.keyVersion).toBe(1);
      expect(Buffer.from(envelope.iv, "base64").length).toBe(12);
      expect(Buffer.from(envelope.authTag, "base64").length).toBe(16);
      expect(envelope.ciphertext).not.toBe(plaintext);

      const decrypted = decryptSensitiveValue(envelope, testContext);
      expect(decrypted).toBe(plaintext);
    });

    it("handles Unicode characters in round trip", () => {
      const unicodeText = "বাংলাদেশ NID 1234567890";
      const envelope = encryptSensitiveValue(unicodeText, testContext);
      const decrypted = decryptSensitiveValue(envelope, testContext);
      expect(decrypted).toBe(unicodeText);
    });

    it("generates a fresh IV for every encryption of identical plaintext", () => {
      const plaintext = "1234567890";
      const env1 = encryptSensitiveValue(plaintext, testContext);
      const env2 = encryptSensitiveValue(plaintext, testContext);

      expect(env1.iv).not.toBe(env2.iv);
      expect(env1.ciphertext).not.toBe(env2.ciphertext);
    });

    it("fails decryption if ciphertext is tampered", () => {
      const envelope = encryptSensitiveValue("1234567890", testContext);
      const tamperedBytes = Buffer.from(envelope.ciphertext, "base64");
      tamperedBytes[0] ^= 0xff;
      envelope.ciphertext = tamperedBytes.toString("base64");

      expect(() => decryptSensitiveValue(envelope, testContext)).toThrow(
        SENSITIVE_ERRORS.SENSITIVE_DATA_INTEGRITY_ERROR
      );
    });

    it("fails decryption if IV is tampered", () => {
      const envelope = encryptSensitiveValue("1234567890", testContext);
      const tamperedIv = Buffer.from(envelope.iv, "base64");
      tamperedIv[0] ^= 0xff;
      envelope.iv = tamperedIv.toString("base64");

      expect(() => decryptSensitiveValue(envelope, testContext)).toThrow(
        SENSITIVE_ERRORS.SENSITIVE_DATA_INTEGRITY_ERROR
      );
    });

    it("fails decryption if authTag is tampered", () => {
      const envelope = encryptSensitiveValue("1234567890", testContext);
      const tamperedTag = Buffer.from(envelope.authTag, "base64");
      tamperedTag[0] ^= 0xff;
      envelope.authTag = tamperedTag.toString("base64");

      expect(() => decryptSensitiveValue(envelope, testContext)).toThrow(
        SENSITIVE_ERRORS.SENSITIVE_DATA_INTEGRITY_ERROR
      );
    });

    it("fails decryption if AAD customerId or recordId is changed (cross-record substitution attack)", () => {
      const envelope = encryptSensitiveValue("1234567890", testContext);
      const attackerContext = {
        ...testContext,
        customerId: "99999999-9999-9999-9999-999999999999",
      };

      expect(() => decryptSensitiveValue(envelope, attackerContext)).toThrow(
        SENSITIVE_ERRORS.SENSITIVE_DATA_INTEGRITY_ERROR
      );
    });

    it("fails decryption if purpose is changed (cross-purpose substitution attack)", () => {
      const envelope = encryptSensitiveValue("1234567890", testContext);
      const attackerContext = {
        ...testContext,
        purpose: "CUSTOMER_BANK_ACCOUNT_NUMBER" as const,
      };

      expect(() => decryptSensitiveValue(envelope, attackerContext)).toThrow(
        SENSITIVE_ERRORS.SENSITIVE_DATA_INTEGRITY_ERROR
      );
    });

    it("never reveals sensitive plaintext or key material in error messages", () => {
      const secretNid = "SECRET_NID_99999999";
      const envelope = encryptSensitiveValue(secretNid, testContext);
      envelope.authTag = Buffer.alloc(16, 0).toString("base64");

      try {
        decryptSensitiveValue(envelope, testContext);
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        expect(msg).not.toContain(secretNid);
        expect(msg).not.toContain("SENSITIVE_DATA_ENCRYPTION_KEY");
      }
    });
  });
});
