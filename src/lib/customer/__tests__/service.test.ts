import { describe, it, expect, vi } from "vitest";
import { createCustomer, updateCustomer, archiveCustomer, restoreCustomer, CUSTOMER_ERRORS } from "../service";
import { mapDetailToEditDTO, type CustomerDetailDTO } from "../types";
import { prisma } from "@/lib/prisma";

describe("Customer Service & Data Minimization Unit Tests", () => {
  describe("mapDetailToEditDTO", () => {
    it("maps CustomerDetailDTO to minimal CustomerEditDTO excluding sensitive/unneeded fields", () => {
      const fullDetail: CustomerDetailDTO = {
        id: "10ca7005-5f02-4919-8384-8f743ad2096b",
        customerCode: "CUS-12345678",
        fullName: "Test Customer",
        fatherName: "Father Name",
        phone: "+8801712345678",
        phoneNormalized: "+8801712345678",
        maskedPhone: "+880 17***-**78",
        whatsappNumber: "+8801812345678",
        whatsappNormalized: "+8801812345678",
        email: "customer@example.com",
        address: "123 Main St",
        emergencyContact: "Emergency: 01511112233",
        internalNotes: "Internal note text",
        isArchived: false,
        createdByAdmin: {
          id: "admin-123",
          name: "Admin User",
        },
        roles: ["BUYER"],
        nidStatus: "PENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditHistory: [
          {
            id: "audit-1",
            action: "CUSTOMER_CREATED",
            createdAt: new Date().toISOString(),
            adminName: "Admin User",
            detailsSummary: "Customer record created",
          },
        ],
      };

      const editDTO = mapDetailToEditDTO(fullDetail);

      // Verify essential edit fields are present
      expect(editDTO.id).toBe(fullDetail.id);
      expect(editDTO.fullName).toBe(fullDetail.fullName);
      expect(editDTO.phone).toBe(fullDetail.phone);
      expect(editDTO.updatedAt).toBe(fullDetail.updatedAt);
      expect(editDTO.roles).toEqual(fullDetail.roles);

      // Verify unneeded fields are omitted from CustomerEditDTO
      const rawEdit = editDTO as unknown as Record<string, unknown>;
      expect(rawEdit.auditHistory).toBeUndefined();
      expect(rawEdit.createdByAdmin).toBeUndefined();
      expect(rawEdit.phoneNormalized).toBeUndefined();
      expect(rawEdit.whatsappNormalized).toBeUndefined();
      expect(rawEdit.nidStatus).toBeUndefined();
      expect(rawEdit.isArchived).toBeUndefined();
      expect(rawEdit.customerCode).toBeUndefined();
    });
  });

  describe("Customer Service Error Sanitization", () => {
    it("sanitizes raw infrastructure or database error on createCustomer", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async () => {
        throw new Error("FATAL: postgres connection failed at postgres://user:pass@127.0.0.1:5434/db");
      });

      const res = await createCustomer("admin-id-123", {
        fullName: "Sanitization Test",
        phone: "01712345678",
        roles: ["BUYER"],
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe(CUSTOMER_ERRORS.GENERIC_CREATE_FAIL);
        expect(res.error).not.toContain("postgres");
        expect(res.error).not.toContain("connection failed");
      }

      vi.restoreAllMocks();
    });

    it("sanitizes raw infrastructure or database error during updateCustomer transaction", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async () => {
        throw new Error("PrismaClientKnownRequestError: P2002 Unique constraint failed on Customer_customerCode_key");
      });

      const res = await updateCustomer("admin-id-123", "10ca7005-5f02-4919-8384-8f743ad2096b", {
        fullName: "Sanitization Test",
        phone: "01712345678",
        roles: ["BUYER"],
        expectedUpdatedAt: new Date().toISOString(),
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe(CUSTOMER_ERRORS.GENERIC_UPDATE_FAIL);
        expect(res.error).not.toContain("P2002");
        expect(res.error).not.toContain("Unique constraint");
      }

      vi.restoreAllMocks();
    });

    it("sanitizes raw infrastructure or database error during archiveCustomer transaction", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async () => {
        throw new Error("Database connection reset by peer");
      });

      const res = await archiveCustomer("admin-id-123", "10ca7005-5f02-4919-8384-8f743ad2096b", new Date().toISOString());

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe(CUSTOMER_ERRORS.GENERIC_STATUS_FAIL);
        expect(res.error).not.toContain("connection reset");
      }

      vi.restoreAllMocks();
    });

    it("sanitizes raw infrastructure or database error during restoreCustomer transaction", async () => {
      vi.spyOn(prisma, "$transaction").mockImplementationOnce(async () => {
        throw new Error("Database connection reset by peer");
      });

      const res = await restoreCustomer("admin-id-123", "10ca7005-5f02-4919-8384-8f743ad2096b", new Date().toISOString());

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBe(CUSTOMER_ERRORS.GENERIC_STATUS_FAIL);
        expect(res.error).not.toContain("connection reset");
      }

      vi.restoreAllMocks();
    });
  });
});
