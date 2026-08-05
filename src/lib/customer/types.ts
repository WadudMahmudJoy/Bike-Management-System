import type { CustomerRoleType, NidStatus } from "@/generated/prisma/client";

export type { CustomerRoleType, NidStatus };

export interface CustomerDTO {
  id: string;
  customerCode: string;
  fullName: string;
  fatherName: string | null;
  phone: string;
  phoneNormalized: string;
  whatsappNumber: string | null;
  whatsappNormalized: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
  internalNotes: string | null;
  isArchived: boolean;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListItemDTO {
  id: string;
  customerCode: string;
  fullName: string;
  maskedPhone: string;
  roles: CustomerRoleType[];
  nidStatus: NidStatus;
  isArchived: boolean;
  createdAt: string;
}

export interface CustomerAuditLogDTO {
  id: string;
  action: string;
  createdAt: string;
  adminName: string | null;
  detailsSummary: string;
}

export interface CustomerDetailDTO {
  id: string;
  customerCode: string;
  fullName: string;
  fatherName: string | null;
  phone: string;
  phoneNormalized: string;
  maskedPhone: string;
  whatsappNumber: string | null;
  whatsappNormalized: string | null;
  email: string | null;
  address: string | null;
  emergencyContact: string | null;
  internalNotes: string | null;
  isArchived: boolean;
  createdByAdmin: {
    id: string;
    name: string;
    email: string;
  } | null;
  roles: CustomerRoleType[];
  nidStatus: NidStatus;
  createdAt: string;
  updatedAt: string;
  auditHistory: CustomerAuditLogDTO[];
}

export interface MatchingCustomerDTO {
  id: string;
  customerCode: string;
  fullName: string;
  maskedPhone: string;
  roles: CustomerRoleType[];
  isArchived: boolean;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matchingCustomers: MatchingCustomerDTO[];
  duplicateCustomerIds: string[];
}

export interface CreateCustomerInput {
  fullName: string;
  fatherName?: string | null;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  internalNotes?: string | null;
  roles: CustomerRoleType[];
  confirmDuplicate?: boolean;
  expectedDuplicateCustomerIds?: string[];
}

export interface UpdateCustomerInput {
  fullName: string;
  fatherName?: string | null;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  internalNotes?: string | null;
  roles: CustomerRoleType[];
  expectedUpdatedAt: string;
  confirmDuplicate?: boolean;
  expectedDuplicateCustomerIds?: string[];
}

export interface CustomerFilterParams {
  page?: number;
  limit?: number;
  query?: string;
  role?: CustomerRoleType;
  nidStatus?: NidStatus;
  archiveFilter?: "active" | "archived" | "all";
  sortOrder?: "desc" | "asc";
}

export interface PaginatedCustomersResult {
  customers: CustomerListItemDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
