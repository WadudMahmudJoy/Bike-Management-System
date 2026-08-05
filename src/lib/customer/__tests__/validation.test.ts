import { describe, it, expect } from "vitest";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerFilterSchema,
  customerIdSchema,
  isoTimestampSchema,
} from "../validation";

describe("Customer Validation Schemas", () => {
  describe("customerIdSchema", () => {
    it("accepts valid UUID strings", () => {
      const valid = "10ca7005-5f02-4919-8384-8f743ad2096b";
      expect(customerIdSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects non-UUID strings", () => {
      expect(customerIdSchema.safeParse("invalid-id-string").success).toBe(false);
      expect(customerIdSchema.safeParse("12345").success).toBe(false);
    });
  });

  describe("isoTimestampSchema", () => {
    it("accepts valid ISO datetime strings", () => {
      expect(isoTimestampSchema.safeParse(new Date().toISOString()).success).toBe(true);
    });

    it("rejects missing or invalid timestamp strings", () => {
      expect(isoTimestampSchema.safeParse("").success).toBe(false);
      expect(isoTimestampSchema.safeParse("invalid-date").success).toBe(false);
    });
  });

  describe("createCustomerSchema", () => {
    it("validates a complete valid customer creation payload and converts whitespace-only optionals to null", () => {
      const payload = {
        fullName: "Rahim Uddin",
        fatherName: "   ",
        phone: "01712345678",
        whatsappNumber: "  ",
        email: "   ",
        address: "   ",
        emergencyContact: "   ",
        internalNotes: "   ",
        roles: ["BUYER", "SELLER"],
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fatherName).toBeNull();
        expect(result.data.whatsappNumber).toBeNull();
        expect(result.data.email).toBeNull();
        expect(result.data.address).toBeNull();
        expect(result.data.emergencyContact).toBeNull();
        expect(result.data.internalNotes).toBeNull();
      }
    });

    it("requires at least one customer role", () => {
      const payload = {
        fullName: "Rahim Uddin",
        phone: "01712345678",
        roles: [],
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects invalid primary phone numbers", () => {
      const payload = {
        fullName: "Rahim Uddin",
        phone: "01212345678", // invalid prefix 012
        roles: ["BUYER"],
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects unknown unexpected properties due to strict schema", () => {
      const payload = {
        fullName: "Rahim Uddin",
        phone: "01712345678",
        roles: ["BUYER"],
        unexpectedField: "malicious input",
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("updateCustomerSchema", () => {
    it("requires expectedUpdatedAt for optimistic concurrency control", () => {
      const payload = {
        fullName: "Rahim Uddin",
        phone: "01712345678",
        roles: ["BUYER"],
        // missing expectedUpdatedAt
      };

      const result = updateCustomerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("validates payload with expectedUpdatedAt", () => {
      const payload = {
        fullName: "Rahim Uddin",
        phone: "01712345678",
        roles: ["BUYER"],
        expectedUpdatedAt: new Date().toISOString(),
      };

      const result = updateCustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("customerFilterSchema", () => {
    it("falls back to default page 1 and limit 20 on invalid filter params without throwing", () => {
      const result = customerFilterSchema.safeParse({ page: "invalid", limit: "invalid", role: "INVALID_ROLE" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.role).toBeUndefined();
      }
    });

    it("enforces page size cap of 100", () => {
      const result = customerFilterSchema.safeParse({ limit: 500 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20); // caught and defaulted to 20
      }
    });

    it("defaults page to 1, limit to 20, archiveFilter to active", () => {
      const result = customerFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.archiveFilter).toBe("active");
      }
    });
  });
});
