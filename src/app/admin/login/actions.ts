"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateAndNormalizeEmail, emailSchema } from "@/lib/auth/email";
import { verifyPassword, verifyAgainstDummy } from "@/lib/auth/password";
import {
  checkThrottle,
  recordFailedAttempt,
  clearThrottle,
} from "@/lib/auth/login-throttle";
import { createAdminSession, logoutAdmin } from "@/lib/auth/session";
import { getClientAddress } from "@/lib/auth/client-address";
import type { LoginResult } from "@/lib/auth/types";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

const GENERIC_ERROR = "Invalid email or password.";
const THROTTLE_ERROR = "Too many sign-in attempts. Please try again later.";

/**
 * Server Action for admin login.
 * Validates credentials, enforces throttling, creates session on success.
 * Never reveals whether an email exists or which part of credentials failed.
 */
export async function loginAction(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  try {
    // 1. Validate form data
    const raw = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: GENERIC_ERROR };
    }

    const { email, password } = parsed.data;
    const normalized = validateAndNormalizeEmail(email);
    if (!normalized) {
      return { success: false, error: GENERIC_ERROR };
    }

    const clientAddress = await getClientAddress();

    // 2. Check throttle BEFORE authentication
    const throttleCheck = await checkThrottle(normalized, clientAddress);
    if (throttleCheck.blocked) {
      return { success: false, error: THROTTLE_ERROR };
    }

    // 3. Look up admin by normalized email
    const admin = await prisma.adminUser.findUnique({
      where: { normalizedEmail: normalized },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        name: true,
      },
    });

    // 4. Verify password (constant-work for nonexistent accounts)
    let passwordValid = false;
    if (!admin) {
      await verifyAgainstDummy(password);
    } else {
      passwordValid = await verifyPassword(admin.passwordHash, password);
    }

    // 5. Check credentials and active status
    if (!admin || !passwordValid || !admin.isActive) {
      await recordFailedAttempt(normalized, clientAddress);
      return { success: false, error: GENERIC_ERROR };
    }

    // 6. Success: update lastLoginAt and write audit log in transaction
    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent");

    await prisma.$transaction(async (tx) => {
      // Update lastLoginAt
      await tx.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      // Write redacted audit log entry
      await tx.auditLog.create({
        data: {
          adminUserId: admin.id,
          action: "ADMIN_LOGIN_SUCCESS",
          entityType: "AdminSession",
          entityId: admin.id,
        },
      });
    });

    // Clear throttle outside transaction (uses its own HMAC computation)
    await clearThrottle(normalized, clientAddress);

    // Create session and set cookie
    await createAdminSession(admin.id, clientAddress, userAgent);
  } catch {
    // Never expose database or internal errors
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }

  // Redirect MUST be outside try/catch (Next.js throws NEXT_REDIRECT)
  redirect("/admin/dashboard");
}

/**
 * Server Action for admin logout.
 * Revokes session, preserves session history, writes safe audit log.
 * Idempotent — safe to call repeatedly.
 */
export async function logoutAction(): Promise<void> {
  try {
    await logoutAdmin();
  } catch {
    // Logout must not fail visibly
  }

  redirect("/admin/login");
}
