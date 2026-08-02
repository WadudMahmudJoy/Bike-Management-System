import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

/**
 * Optimistic Edge Proxy for admin route protection.
 *
 * Security & Design Rules:
 * - Checks only cookie presence at the edge (no Prisma DB or Argon2 imports).
 * - Excludes /admin/login route explicitly.
 * - Enforces production cookie name (__Host-sdb_admin_session) in production,
 *   and development cookie name (sdb_admin_session) in non-production environments.
 * - Full database session verification occurs in server-side layout / DAL (dal.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude /admin/login route explicitly from redirect checks
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Optimistic cookie-presence check for protected /admin routes
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isProd = process.env.NODE_ENV === "production";
    const requiredCookieName = isProd
      ? "__Host-sdb_admin_session"
      : "sdb_admin_session";

    const hasSessionCookie = request.cookies.has(requiredCookieName);

    if (!hasSessionCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}
