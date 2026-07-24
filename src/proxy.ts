import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTokenExpired } from "@/utils/jwt";

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/team-signup",
  "/google-access",
  "/r",
  "/snapshot",
  "/admin/login",
  "/email/verify",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    const adminToken = request.cookies.get("admin_token")?.value;
    const hasExpiredAdminToken =
      Boolean(adminToken) && isTokenExpired(adminToken as string);

    if (pathname === "/admin/login") {
      if (adminToken && !hasExpiredAdminToken) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      const response = NextResponse.next();
      if (hasExpiredAdminToken) {
        response.cookies.set("admin_token", "", {
          path: "/admin",
          maxAge: 0,
        });
      }
      return response;
    }

    if (!adminToken || hasExpiredAdminToken) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search || ""}`);
      const response = NextResponse.redirect(loginUrl);
      if (hasExpiredAdminToken) {
        response.cookies.set("admin_token", "", {
          path: "/admin",
          maxAge: 0,
        });
      }
      return response;
    }

    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const token = request.cookies.get("token")?.value;

  const hasExpiredToken = token && isTokenExpired(token);

  if ((!token || hasExpiredToken) && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    const fullPathWithQuery = `${pathname}${search || ""}`;
    loginUrl.searchParams.set("redirect", fullPathWithQuery);

    const response = NextResponse.redirect(loginUrl);

    // If token is expired, we might want to clear it, but the main thing is redirecting.
    // Clearing it ensures the client doesn't try to use it again immediately.
    if (hasExpiredToken) {
      response.cookies.delete("token");
    }

    return response;
  }

  if (token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
