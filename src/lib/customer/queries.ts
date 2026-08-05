import "server-only";
import { prisma } from "@/lib/prisma";
import { maskPhone, normalizeBangladeshPhone } from "./phone";
import { customerFilterSchema } from "./validation";
import type {
  CustomerFilterParams,
  CustomerListItemDTO,
  CustomerDetailDTO,
  DuplicateCheckResult,
  MatchingCustomerDTO,
  PaginatedCustomersResult,
} from "./types";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Checks for existing active or archived customers sharing the same normalized primary phone.
 * Masked phone is returned in matching customers for UX display.
 * Accepts optional transaction client.
 */
export async function checkDuplicatePhone(
  phoneNormalized: string,
  excludeCustomerId?: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<DuplicateCheckResult> {
  const client = tx ?? prisma;

  if (!phoneNormalized) {
    return { hasDuplicates: false, matchingCustomers: [], duplicateCustomerIds: [] };
  }

  const matches = await client.customer.findMany({
    where: {
      phoneNormalized,
      ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {}),
    },
    include: {
      roles: { select: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (matches.length === 0) {
    return { hasDuplicates: false, matchingCustomers: [], duplicateCustomerIds: [] };
  }

  const matchingCustomers: MatchingCustomerDTO[] = matches.map((c) => ({
    id: c.id,
    customerCode: c.customerCode ?? c.id.substring(0, 8),
    fullName: c.fullName,
    maskedPhone: maskPhone(c.phone),
    roles: c.roles.map((r) => r.role),
    isArchived: c.isArchived,
  }));

  return {
    hasDuplicates: true,
    matchingCustomers,
    duplicateCustomerIds: matches.map((c) => c.id).sort(),
  };
}

/**
 * Bounded paginated search and list query for customers.
 * Defaults to page size 20, max 100.
 * List view exposes ONLY masked phone numbers.
 */
export async function getCustomerList(
  params: CustomerFilterParams,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<PaginatedCustomersResult> {
  const client = tx ?? prisma;
  const parsed = customerFilterSchema.parse(params);
  const { page, limit, query, role, nidStatus, archiveFilter, sortOrder } = parsed;

  const whereClause: Prisma.CustomerWhereInput = {};

  // Archive filter
  if (archiveFilter === "active") {
    whereClause.isArchived = false;
  } else if (archiveFilter === "archived") {
    whereClause.isArchived = true;
  }

  // Role filter
  if (role) {
    whereClause.roles = {
      some: { role },
    };
  }

  // NID status filter
  if (nidStatus) {
    whereClause.identity = {
      nidStatus,
    };
  }

  // Bounded search query
  if (query && query.trim().length > 0) {
    const trimmedQuery = query.trim().substring(0, 100);
    const phoneNorm = normalizeBangladeshPhone(trimmedQuery);

    const searchConditions: Prisma.CustomerWhereInput[] = [
      { customerCode: { contains: trimmedQuery, mode: "insensitive" } },
      { fullName: { contains: trimmedQuery, mode: "insensitive" } },
    ];

    if (phoneNorm) {
      searchConditions.push({ phoneNormalized: { contains: phoneNorm } });
      searchConditions.push({ whatsappNormalized: { contains: phoneNorm } });
    } else {
      searchConditions.push({ phoneNormalized: { contains: trimmedQuery } });
      searchConditions.push({ whatsappNormalized: { contains: trimmedQuery } });
    }

    whereClause.OR = searchConditions;
  }

  const [total, customers] = await Promise.all([
    client.customer.count({ where: whereClause }),
    client.customer.findMany({
      where: whereClause,
      include: {
        roles: { select: { role: true } },
        identity: { select: { nidStatus: true } },
      },
      orderBy: [
        { createdAt: sortOrder },
        { id: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const items: CustomerListItemDTO[] = customers.map((c) => ({
    id: c.id,
    customerCode: c.customerCode ?? c.id.substring(0, 8),
    fullName: c.fullName,
    maskedPhone: maskPhone(c.phone),
    roles: c.roles.map((r) => r.role),
    nidStatus: c.identity?.nidStatus ?? "PENDING",
    isArchived: c.isArchived,
    createdAt: c.createdAt.toISOString(),
  }));

  return {
    customers: items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieves full customer detail by ID for authorized operational views.
 * Exposes full contact information to authenticated admins only.
 */
export async function getCustomerById(
  id: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<CustomerDetailDTO | null> {
  const client = tx ?? prisma;

  const customer = await client.customer.findUnique({
    where: { id },
    include: {
      roles: { select: { role: true } },
      identity: { select: { nidStatus: true } },
      createdByAdmin: { select: { id: true, name: true, email: true } },
    },
  });

  if (!customer) return null;

  // Fetch safe audit history for this customer
  const auditLogs = await client.auditLog.findMany({
    where: {
      entityType: "Customer",
      entityId: id,
    },
    include: {
      admin: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const auditHistory = auditLogs.map((log) => {
    let summary = "Customer record updated";
    if (log.action === "CUSTOMER_CREATED") summary = "Customer record created";
    else if (log.action === "CUSTOMER_ARCHIVED") summary = "Customer deactivated/archived";
    else if (log.action === "CUSTOMER_RESTORED") summary = "Customer reactivated/restored";
    else if (log.action === "CUSTOMER_UPDATED" && log.newValue && typeof log.newValue === "object") {
      const payload = log.newValue as Record<string, unknown>;
      if (Array.isArray(payload.changedFields) && payload.changedFields.length > 0) {
        summary = `Updated fields: ${payload.changedFields.join(", ")}`;
      }
    }

    return {
      id: log.id,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      adminName: log.admin?.name ?? "System",
      detailsSummary: summary,
    };
  });

  return {
    id: customer.id,
    customerCode: customer.customerCode ?? customer.id.substring(0, 8),
    fullName: customer.fullName,
    fatherName: customer.fatherName,
    phone: customer.phone,
    phoneNormalized: customer.phoneNormalized,
    maskedPhone: maskPhone(customer.phone),
    whatsappNumber: customer.whatsappNumber,
    whatsappNormalized: customer.whatsappNormalized,
    email: customer.email,
    address: customer.address,
    emergencyContact: customer.emergencyContact,
    internalNotes: customer.internalNotes,
    isArchived: customer.isArchived,
    createdByAdmin: customer.createdByAdmin,
    roles: customer.roles.map((r) => r.role),
    nidStatus: customer.identity?.nidStatus ?? "PENDING",
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    auditHistory,
  };
}
