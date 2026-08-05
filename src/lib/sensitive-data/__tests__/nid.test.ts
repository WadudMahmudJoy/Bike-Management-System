import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeBangladeshNid,
  validateBangladeshNid,
  maskNid,
  getNidLastFour,
  computeNidLookupHmac,
  isValidNidStatusTransition,
} from "../nid";

describe("Bangladesh NID Utilities & HMAC Lookup", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SENSITIVE_DATA_ACTIVE_KEY_VERSION = "1";
    process.env.SENSITIVE_DATA_ENCRYPTION_KEY_V1 = Buffer.alloc(32, "a").toString("base64");
    process.env.SENSITIVE_DATA_LOOKUP_HMAC_KEY = Buffer.alloc(32, "b").toString("base64");
  });

  describe("Normalization & Validation", () => {
    it("accepts valid 10-digit Smart NID", () => {
      const nid = "1234567890";
      expect(normalizeBangladeshNid(nid)).toBe("1234567890");
      expect(validateBangladeshNid(nid)).toBe(true);
    });

    it("accepts valid 13-digit NID", () => {
      const nid = "1990123456789";
      expect(normalizeBangladeshNid(nid)).toBe("1990123456789");
      expect(validateBangladeshNid(nid)).toBe(true);
    });

    it("accepts valid 17-digit NID", () => {
      const nid = "19901234567890123";
      expect(normalizeBangladeshNid(nid)).toBe("19901234567890123");
      expect(validateBangladeshNid(nid)).toBe(true);
    });

    it("strips spaces and hyphens safely", () => {
      const formatted = " 1990-1234 56789 0123 ";
      expect(normalizeBangladeshNid(formatted)).toBe("19901234567890123");
    });

    it("rejects invalid lengths (9, 11, 14, 18 digits)", () => {
      expect(validateBangladeshNid("123456789")).toBe(false);
      expect(validateBangladeshNid("12345678901")).toBe(false);
      expect(validateBangladeshNid("12345678901234")).toBe(false);
    });

    it("rejects non-numeric characters and letters", () => {
      expect(validateBangladeshNid("123456789A")).toBe(false);
      expect(validateBangladeshNid("NID-1234567890")).toBe(false);
    });
  });

  describe("Masking", () => {
    it("masks NID exposing only final four digits", () => {
      expect(maskNid("19901234567890123")).toBe("******0123");
      expect(getNidLastFour("19901234567890123")).toBe("0123");
    });
  });

  describe("HMAC-SHA256 Deterministic Lookup", () => {
    it("computes deterministic 64-character lowercase hex HMAC", () => {
      const nid = "19901234567890123";
      const hmac1 = computeNidLookupHmac(nid);
      const hmac2 = computeNidLookupHmac("1990-1234-567890123");

      expect(hmac1).toBe(hmac2);
      expect(hmac1).toMatch(/^[a-f0-9]{64}$/);
      expect(hmac1).not.toContain(nid);
    });

    it("produces distinct HMAC for different NID values", () => {
      const hmac1 = computeNidLookupHmac("19901234567890123");
      const hmac2 = computeNidLookupHmac("19901234567890124");
      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe("Lifecycle Status Transitions", () => {
    it("allows valid transitions", () => {
      expect(isValidNidStatusTransition("PENDING", "SUBMITTED")).toBe(true);
      expect(isValidNidStatusTransition("SUBMITTED", "VERIFIED")).toBe(true);
      expect(isValidNidStatusTransition("SUBMITTED", "NEEDS_CORRECTION")).toBe(true);
      expect(isValidNidStatusTransition("VERIFIED", "NEEDS_CORRECTION")).toBe(true);
      expect(isValidNidStatusTransition("NEEDS_CORRECTION", "SUBMITTED")).toBe(true);
    });

    it("forbids returning any non-PENDING status to PENDING", () => {
      expect(isValidNidStatusTransition("SUBMITTED", "PENDING")).toBe(false);
      expect(isValidNidStatusTransition("VERIFIED", "PENDING")).toBe(false);
      expect(isValidNidStatusTransition("NEEDS_CORRECTION", "PENDING")).toBe(false);
    });
  });
});
