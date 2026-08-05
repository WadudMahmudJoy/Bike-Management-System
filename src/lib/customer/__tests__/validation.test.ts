import { describe, it, expect } from "vitest";
import { createCustomerSchema, updateCustomerSchema, customerFilterSchema } from "../validation";

describe("Customer Validation Schemas", () => {
  describe("createCustomerSchema", () => {
    it("validates a complete valid customer creation payload", () => {
      const payload = {
        fullName: "Rahim Uddin",
        fatherName: "Karim Uddin",
        phone: "01712345678",
        whatsappNumber: "01812345678",
        email: "rahim@example.com",
        address: "Dhaka, Bangladesh",
        emergencyContact: "Brother: 01512345678",
        internalNotes: "VIP customer",
        roles: ["BUYER", "SELLER"],
      };

      const result = createCustomerSchema.safeParse(payload);
      expect(result.success).toBe(true);
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
    it("enforces page size cap of 100", () => {
      const result = customerFilterSchema.safeParse({ limit: 500 });
      expect(result.success).toBe(false);
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

    it("restricts search query string to 100 characters max", () => {
      const longQuery = "a".repeat(150);
      const result = customerFilterSchema.safeParse({ query: longQuery });
      expect(result.success).toBe(false);
    });
  });
});
