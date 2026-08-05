import { z } from "zod";
import { CustomerRoleType, NidStatus } from "@/generated/prisma/client";
import { bdPhoneSchema, optionalBdPhoneSchema } from "./phone";

export const customerRoleEnum = z.nativeEnum(CustomerRoleType);

export const customerIdSchema = z
  .string()
  .min(1, "Customer ID is required")
  .uuid("Invalid customer ID format");

export const isoTimestampSchema = z
  .string()
  .min(1, "Expected update timestamp is required for concurrency control")
  .refine((val) => !isNaN(new Date(val).getTime()), "Invalid expected update timestamp.");

const optionalStringTransformer = (maxLen: number, label: string) =>
  z
    .string()
    .trim()
    .max(maxLen, `${label} must be ${maxLen} characters or less`)
    .optional()
    .nullable()
    .transform((val) => (val === undefined || val === null || val === "" ? null : val));

export const createCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(255, "Full name must be 255 characters or less"),
  fatherName: optionalStringTransformer(255, "Father's name"),
  phone: bdPhoneSchema,
  whatsappNumber: optionalBdPhoneSchema.transform((val) =>
    val === undefined || val === null || val.trim() === "" ? null : val
  ),
  email: z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or less")
    .optional()
    .nullable()
    .refine((val) => !val || val === "" || z.string().email().safeParse(val).success, "Invalid email address")
    .transform((val) => (val === undefined || val === null || val === "" ? null : val.toLowerCase())),
  address: optionalStringTransformer(2000, "Address"),
  emergencyContact: optionalStringTransformer(255, "Emergency contact"),
  internalNotes: optionalStringTransformer(5000, "Internal notes"),
  roles: z
    .array(customerRoleEnum)
    .min(1, "At least one customer role must be selected"),
  confirmDuplicate: z.boolean().optional().default(false),
  expectedDuplicateCustomerIds: z.array(z.string().uuid()).optional(),
}).strict();

export const updateCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(255, "Full name must be 255 characters or less"),
  fatherName: optionalStringTransformer(255, "Father's name"),
  phone: bdPhoneSchema,
  whatsappNumber: optionalBdPhoneSchema.transform((val) =>
    val === undefined || val === null || val.trim() === "" ? null : val
  ),
  email: z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or less")
    .optional()
    .nullable()
    .refine((val) => !val || val === "" || z.string().email().safeParse(val).success, "Invalid email address")
    .transform((val) => (val === undefined || val === null || val === "" ? null : val.toLowerCase())),
  address: optionalStringTransformer(2000, "Address"),
  emergencyContact: optionalStringTransformer(255, "Emergency contact"),
  internalNotes: optionalStringTransformer(5000, "Internal notes"),
  roles: z
    .array(customerRoleEnum)
    .min(1, "At least one customer role must be selected"),
  expectedUpdatedAt: isoTimestampSchema,
  confirmDuplicate: z.boolean().optional().default(false),
  expectedDuplicateCustomerIds: z.array(z.string().uuid()).optional(),
}).strict();

export const customerFilterSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).catch(20).default(20),
  query: z
    .string()
    .trim()
    .max(100, "Search query must be 100 characters or less")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  role: z.nativeEnum(CustomerRoleType).optional().catch(undefined),
  nidStatus: z.nativeEnum(NidStatus).optional().catch(undefined),
  archiveFilter: z.enum(["active", "archived", "all"]).optional().catch("active").default("active"),
  sortOrder: z.enum(["desc", "asc"]).optional().catch("desc").default("desc"),
});
