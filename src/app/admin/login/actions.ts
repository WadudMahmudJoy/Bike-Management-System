"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getClientAddress } from "@/lib/auth/client-address";
import {
  getSessionCookieName,
  getAdminSessionCookieOptions,
} from "@/lib/auth/constants";
import { authenticateAdminCredentials } from "@/lib/auth/auth-service";
import { logoutAdmin, revokeAdminSessionToken } from "@/lib/auth/session";
import type { LoginResult } from "@/lib/auth/types";
import type { RevokeSessionResult } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().transform((val) => val.trim()),
  password: z.string().min(1, "Password is required."),
});

const GENERIC_ERROR = "Invalid email or password.";

/**
 * Server Action for admin login.
 * Delegates credential authentication to server-only auth service,
 * sets HttpOnly session cookie using exact session expiresAt, and redirects to dashboard.
 */
export async function loginAction(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  try {
    const raw = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: GENERIC_ERROR };
    }

    const { email, password } = parsed.data;
    const clientAddress = await getClientAddress();
    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent");

    const authResult = await authenticateAdminCredentials({
      email,
      password,
      clientAddress,
      userAgent,
    });

    if (
      !authResult.success ||
      !authResult.rawToken ||
      !authResult.expiresAt
    ) {
      return { success: false, error: authResult.error ?? GENERIC_ERROR };
    }

    // Set HttpOnly session cookie using exact database session expiresAt
    const cookieName = getSessionCookieName();
    const cookieOptions = getAdminSessionCookieOptions(authResult.expiresAt);

    try {
      const cookieStore = await cookies();
      cookieStore.set(cookieName, authResult.rawToken, cookieOptions);
    } catch {
      // If cookie setting fails, revoke the newly created session
      if (authResult.rawToken) {
        await revokeAdminSessionToken(authResult.rawToken);
      }
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }

  // Redirect MUST be outside try/catch (Next.js throws NEXT_REDIRECT)
  redirect("/admin/dashboard");
}

export type LogoutResult = {
  success?: boolean;
  error?: string;
};

/**
 * Server Action for admin logout.
 * Calls logoutAdmin(), revokes database session, deletes cookie, and redirects upon success.
 * If database revocation fails, returns error state without deleting cookie or redirecting.
 */
export async function logoutAction(): Promise<LogoutResult> {
  let result: RevokeSessionResult;
  try {
    result = await logoutAdmin();
  } catch {
    return {
      success: false,
      error: "Unable to sign out securely. Please try again.",
    };
  }

  if (!result.success) {
    return {
      success: false,
      error: "Unable to sign out securely. Please try again.",
    };
  }

  redirect("/admin/login");
}
