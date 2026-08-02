import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_ADMIN_PATHS = /^\/admin(?!\/login)(\/.*)?$/;
const SKIP_PATHS = /^\/(api|_next\/static|_next\/image|favicon\.ico|robots\.txt|sitemap\.xml)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-page requests
  if (SKIP_PATHS.test(pathname)) {
    return NextResponse.next();
  }

  // Check protected admin paths (not /admin/login)
  if (PROTECTED_ADMIN_PATHS.test(pathname)) {
    // Optimistic cookie check only - NOT authorization
    const hasDevCookie = request.cookies.has("sdb_admin_session");
    const hasProdCookie = request.cookies.has("__Host-sdb_admin_session");
    
    if (!hasDevCookie && !hasProdCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}
