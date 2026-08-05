import "server-only";
import { prisma } from "@/lib/prisma";
import { maskPhone, normalizeBangladeshPhone } from "./phone";
import { customerFilterSchema, customerIdSchema } from "./validation";
import type {
  CustomerFilterParams,
  CustomerListItemDTO,
  CustomerDetailDTO,
  DuplicateWarningDTO,
  MatchingCustomerDTO,
  PaginatedCustomersResult,
} from "./types";
import type { CustomerRoleType, NidStatus, Prisma } from "@/generated/prisma/client";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Checks for existing active or archived customers sharing the same normalized primary phone.
 * Masked phone is returned in matching customers for UX display.
 * Executes queries sequentially to avoid transaction client concurrency warnings.
 */
export async function checkDuplicatePhone(
  phoneNormalized: string,
  excludeCustomerId?: string,
  tx?: TxClient
): Promise<DuplicateWarningDTO> {
  const client = tx ?? prisma;

  if (!phoneNormalized) {
    return { hasDuplicates: false, matchingCustomers: [], duplicateCustomerIds: [] };
  }

  const matches = await client.customer.findMany({
    where: {
      phoneNormalized,
      ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {}),
    },
    select: {
      id: true,
      customerCode: true,
      fullName: true,
      phone: true,
      isArchived: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (matches.length === 0) {
    return { hasDuplicates: false, matchingCustomers: [], duplicateCustomerIds: [] };
  }

  const matchIds = matches.map((m) => m.id);
  const rolesRecords = await client.customerRole.findMany({
    where: { customerId: { in: matchIds } },
    select: { customerId: true, role: true },
  });

  const rolesMap = new Map<string, CustomerRoleType[]>();
  rolesRecords.forEach((r) => {
    const list = rolesMap.get(r.customerId) ?? [];
    list.push(r.role);
    rolesMap.set(r.customerId, list);
  });

  const matchingCustomers: MatchingCustomerDTO[] = matches.map((c) => ({
    id: c.id,
    customerCode: c.customerCode ?? c.id.substring(0, 8),
    fullName: c.fullName,
    maskedPhone: maskPhone(c.phone),
    roles: rolesMap.get(c.id) ?? [],
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
 * Sequential execution avoids PostgreSQL driver deprecation warnings on shared transaction connection clients.
 */
export async function getCustomerList(
  params: CustomerFilterParams,
  tx?: TxClient
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

  // Execute queries sequentially to prevent parallel execution over single transaction client
  const total = await client.customer.count({ where: whereClause });
  const customers = await client.customer.findMany({
    where: whereClause,
    select: {
      id: true,
      customerCode: true,
      fullName: true,
      phone: true,
      isArchived: true,
      createdAt: true,
    },
    orderBy: [
      { createdAt: sortOrder },
      { id: "desc" },
    ],
    skip: (page - 1) * limit,
    take: limit,
  });

  const customerIds = customers.map((c) => c.id);

  const rolesRecords = await client.customerRole.findMany({
    where: { customerId: { in: customerIds } },
    select: { customerId: true, role: true },
  });

  const identityRecords = await client.customerIdentity.findMany({
    where: { customerId: { in: customerIds } },
    select: { customerId: true, nidStatus: true },
  });

  const rolesMap = new Map<string, CustomerRoleType[]>();
  rolesRecords.forEach((r) => {
    const list = rolesMap.get(r.customerId) ?? [];
    list.push(r.role);
    rolesMap.set(r.customerId, list);
  });

  const identityMap = new Map<string, string>();
  identityRecords.forEach((i) => {
    identityMap.set(i.customerId, i.nidStatus);
  });

  const items: CustomerListItemDTO[] = customers.map((c) => ({
    id: c.id,
    customerCode: c.customerCode ?? c.id.substring(0, 8),
    fullName: c.fullName,
    maskedPhone: maskPhone(c.phone),
    roles: rolesMap.get(c.id) ?? [],
    nidStatus: (identityMap.get(c.id) as NidStatus) ?? "PENDING",
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
 * Sequential execution avoids PostgreSQL driver deprecation warnings on shared connection clients.
 */
export async function getCustomerById(
  id: string,
  tx?: TxClient
): Promise<CustomerDetailDTO | null> {
  const idParsed = customerIdSchema.safeParse(id);
  if (!idParsed.success) {
    return null;
  }

  const client = tx ?? prisma;

  const customer = await client.customer.findUnique({
    where: { id },
    select: {
      id: true,
      customerCode: true,
      fullName: true,
      fatherName: true,
      phone: true,
      phoneNormalized: true,
      whatsappNumber: true,
      whatsappNormalized: true,
      email: true,
      address: true,
      emergencyContact: true,
      internalNotes: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
      createdByAdmin: { select: { id: true, name: true, email: true } },
    },
  });

  if (!customer) return null;

  const rolesRecords = await client.customerRole.findMany({
    where: { customerId: id },
    select: { role: true },
  });

  const identityRecord = await client.customerIdentity.findUnique({
    where: { customerId: id },
    select: { nidStatus: true },
  });

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
    roles: rolesRecords.map((r) => r.role),
    nidStatus: identityRecord?.nidStatus ?? "PENDING",
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    auditHistory,
  };
}
