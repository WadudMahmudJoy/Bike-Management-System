import { describe, it, expect, vi } from "vitest";
import { createCustomer, updateCustomer, archiveCustomer, restoreCustomer, CUSTOMER_ERRORS } from "../service";
import { prisma } from "@/lib/prisma";

describe("Customer Service Error Sanitization Unit Tests", () => {
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
