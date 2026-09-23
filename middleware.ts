/**
 * =============================================================================
 *  Next.js Middleware — Admin Area Protection
 *
 *  All routes under `/admin` (except `/admin/login`) require a valid
 *  `admin_token` cookie.  If the cookie is missing, the user is redirected
 *  to the login page.
 *
 *  The cookie is set by `POST /api/auth` after the admin provides the
 *  correct password.  On the Edge Runtime, middleware can NOT read
 *  `process.env`, so the token validity check is deferred to the layout.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page itself and its API.
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Protect everything under /admin.
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("admin_token");
    if (!token?.value) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};