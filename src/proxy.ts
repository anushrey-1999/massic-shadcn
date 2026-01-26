import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isTokenExpired } from "@/utils/jwt";

const PUBLIC_ROUTES = ["/login", "/signup", "/team-signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const token = request.cookies.get("token")?.value;

  const hasExpiredToken = token && isTokenExpired(token);

  if ((!token || hasExpiredToken) && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);

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
