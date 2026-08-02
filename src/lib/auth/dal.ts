import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "./session";
import type { AdminSessionDTO } from "./types";
import type { AdminRole } from "@/generated/prisma/client";

/**
 * Verify and return the current admin session.
 * Uses React cache() for request-scoped deduplication.
 */
export const verifySession = cache(async (): Promise<AdminSessionDTO | null> => {
  const result = await getCurrentAdminSession();
  if (!result) return null;
  return result.admin;
});

/**
 * Require a valid admin session. Redirects to login if unauthenticated.
 * Use in protected Server Components and layouts.
 */
export async function requireAdmin(): Promise<AdminSessionDTO> {
  const admin = await verifySession();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}

/**
 * Require a specific admin role. Redirects to login if unauthenticated.
 * Throws 403-equivalent error if role is insufficient.
 */
export async function requireAdminRole(...allowedRoles: AdminRole[]): Promise<AdminSessionDTO> {
  const admin = await requireAdmin();
  if (!allowedRoles.includes(admin.role)) {
    // In a real app, this would render a 403 page
    // For now, redirect to dashboard with insufficient permissions
    redirect("/admin/dashboard");
  }
  return admin;
}
