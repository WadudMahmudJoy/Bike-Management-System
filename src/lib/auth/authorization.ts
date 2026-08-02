import "server-only";
import { getCurrentAdminSession } from "./session";
import type { AdminSessionDTO } from "./types";
import type { AdminRole } from "@/generated/prisma/client";

/**
 * Verify admin authorization for Server Actions.
 * Returns the admin DTO or null.
 * Does NOT redirect - callers must handle unauthorized state.
 */
export async function getAuthorizedAdmin(): Promise<AdminSessionDTO | null> {
  const result = await getCurrentAdminSession();
  return result?.admin ?? null;
}

/**
 * Check if admin has one of the required roles.
 */
export function hasRequiredRole(admin: AdminSessionDTO, ...roles: AdminRole[]): boolean {
  return roles.includes(admin.role);
}
