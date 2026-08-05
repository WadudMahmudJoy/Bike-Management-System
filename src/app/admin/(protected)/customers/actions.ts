"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import {
  createCustomer,
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
  type ServiceResult,
} from "@/lib/customer/service";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerDetailDTO,
} from "@/lib/customer/types";

/**
 * Server action to create a new customer record.
 * Authenticates the admin via session and invokes the domain service.
 */
export async function createCustomerAction(
  input: CreateCustomerInput
): Promise<ServiceResult<CustomerDetailDTO>> {
  const admin = await requireAdmin();

  const result = await createCustomer(admin.id, input);

  if (result.success) {
    revalidatePath("/admin/customers");
  }

  return result;
}

/**
 * Server action to update an existing customer record.
 * Authenticates the admin via session and enforces optimistic concurrency.
 */
export async function updateCustomerAction(
  id: string,
  input: UpdateCustomerInput
): Promise<ServiceResult<CustomerDetailDTO>> {
  const admin = await requireAdmin();

  const result = await updateCustomer(admin.id, id, input);

  if (result.success) {
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    revalidatePath(`/admin/customers/${id}/edit`);
  }

  return result;
}

/**
 * Server action to archive (deactivate) a customer.
 */
export async function archiveCustomerAction(
  id: string,
  expectedUpdatedAt?: string
): Promise<ServiceResult<CustomerDetailDTO>> {
  const admin = await requireAdmin();

  const result = await archiveCustomer(admin.id, id, expectedUpdatedAt);

  if (result.success) {
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
  }

  return result;
}

/**
 * Server action to restore (reactivate) an archived customer.
 */
export async function restoreCustomerAction(
  id: string,
  expectedUpdatedAt?: string
): Promise<ServiceResult<CustomerDetailDTO>> {
  const admin = await requireAdmin();

  const result = await restoreCustomer(admin.id, id, expectedUpdatedAt);

  if (result.success) {
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
  }

  return result;
}
