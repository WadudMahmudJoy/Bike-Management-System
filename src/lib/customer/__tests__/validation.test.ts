import { describe, it, expect } from "vitest";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerFilterSchema,
  parseCustomerFilters,
  customerIdSchema,
  isoTimestampSchema,
} from "../validation";

describe("Customer Validation Schemas & Non-Throwing Filter Parser", () => {
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

  describe("parseCustomerFilters (Non-Throwing Safety)", () => {
    it("caps 101-character search query to 100 characters without throwing", () => {
      const longQuery = "a".repeat(101);
      expect(() => parseCustomerFilters({ query: longQuery })).not.toThrow();

      const parsed = parseCustomerFilters({ query: longQuery });
      expect(parsed.query).toBeDefined();
      expect(parsed.query?.length).toBe(100);
      expect(parsed.query).toBe("a".repeat(100));
    });

    it("falls back to default page 1 for negative or invalid page numbers without throwing", () => {
      expect(() => parseCustomerFilters({ page: -5 })).not.toThrow();
      expect(parseCustomerFilters({ page: -5 }).page).toBe(1);

      expect(() => parseCustomerFilters({ page: "invalid" })).not.toThrow();
      expect(parseCustomerFilters({ page: "invalid" }).page).toBe(1);
    });

    it("handles very large page numbers safely", () => {
      const directResult = customerFilterSchema.safeParse({ page: 999999 });
      expect(directResult.success).toBe(true);
      const parsed = parseCustomerFilters({ page: 999999 });
      expect(parsed.page).toBe(999999);
    });

    it("ignores invalid role values without throwing", () => {
      expect(() => parseCustomerFilters({ role: "MALICIOUS_ROLE" })).not.toThrow();
      const parsed = parseCustomerFilters({ role: "MALICIOUS_ROLE" });
      expect(parsed.role).toBeUndefined();
    });

    it("ignores invalid NID status values without throwing", () => {
      expect(() => parseCustomerFilters({ nidStatus: "INVALID_NID_STATUS" })).not.toThrow();
      const parsed = parseCustomerFilters({ nidStatus: "INVALID_NID_STATUS" });
      expect(parsed.nidStatus).toBeUndefined();
    });

    it("defaults invalid archive filter safely to 'active'", () => {
      expect(() => parseCustomerFilters({ archiveFilter: "invalid-archive-state" })).not.toThrow();
      const parsed = parseCustomerFilters({ archiveFilter: "invalid-archive-state" });
      expect(parsed.archiveFilter).toBe("active");
    });

    it("defaults invalid sort order safely to 'desc'", () => {
      expect(() => parseCustomerFilters({ sortOrder: "invalid-sort" })).not.toThrow();
      const parsed = parseCustomerFilters({ sortOrder: "invalid-sort" });
      expect(parsed.sortOrder).toBe("desc");
    });

    it("returns safe default filters when passed null or undefined", () => {
      const parsedNull = parseCustomerFilters(null);
      expect(parsedNull.page).toBe(1);
      expect(parsedNull.limit).toBe(20);
      expect(parsedNull.archiveFilter).toBe("active");
      expect(parsedNull.sortOrder).toBe("desc");

      const parsedUndefined = parseCustomerFilters(undefined);
      expect(parsedUndefined.page).toBe(1);
      expect(parsedUndefined.limit).toBe(20);
    });
  });
});
