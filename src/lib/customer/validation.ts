import { z } from "zod";
import { CustomerRoleType, NidStatus } from "@/generated/prisma/client";
import { bdPhoneSchema, optionalBdPhoneSchema } from "./phone";

export const customerRoleEnum = z.nativeEnum(CustomerRoleType);

export const createCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(255, "Full name must be 255 characters or less"),
  fatherName: z
    .string()
    .trim()
    .max(255, "Father's name must be 255 characters or less")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  phone: bdPhoneSchema,
  whatsappNumber: optionalBdPhoneSchema.transform((val) => (val === "" ? null : val)),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be 255 characters or less")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  address: z
    .string()
    .trim()
    .max(2000, "Address must be 2000 characters or less")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  emergencyContact: z
    .string()
    .trim()
    .max(255, "Emergency contact must be 255 characters or less")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  internalNotes: z
    .string()
    .trim()
    .max(5000, "Internal notes must be 5000 characters or less")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  roles: z
    .array(customerRoleEnum)
    .min(1, "At least one customer role must be selected"),
  confirmDuplicate: z.boolean().optional().default(false),
  expectedDuplicateCustomerIds: z.array(z.string().uuid()).optional(),
});

export const updateCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(255, "Full name must be 255 characters or less"),
  fatherName: z
    .string()
    .trim()
    .max(255, "Father's name must be 255 characters or less")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  phone: bdPhoneSchema,
  whatsappNumber: optionalBdPhoneSchema.transform((val) => (val === "" ? null : val)),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be 255 characters or less")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  address: z
    .string()
    .trim()
    .max(2000, "Address must be 2000 characters or less")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  emergencyContact: z
    .string()
    .trim()
    .max(255, "Emergency contact must be 255 characters or less")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  internalNotes: z
    .string()
    .trim()
    .max(5000, "Internal notes must be 5000 characters or less")
    .optional()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  roles: z
    .array(customerRoleEnum)
    .min(1, "At least one customer role must be selected"),
  expectedUpdatedAt: z
    .string()
    .min(1, "Expected updated timestamp is required for concurrency control"),
  confirmDuplicate: z.boolean().optional().default(false),
  expectedDuplicateCustomerIds: z.array(z.string().uuid()).optional(),
});

export const customerFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z
    .string()
    .trim()
    .max(100, "Search query must be 100 characters or less")
    .optional(),
  role: z.nativeEnum(CustomerRoleType).optional(),
  nidStatus: z.nativeEnum(NidStatus).optional(),
  archiveFilter: z.enum(["active", "archived", "all"]).optional().default("active"),
  sortOrder: z.enum(["desc", "asc"]).optional().default("desc"),
});
