import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/set-password", "/authentication/verify", "/authentication/setup"];
const AUTH_COOKIE = "ezrcm_signed_in";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Edge middleware for enterprise-level route protection.
 * Redirects unauthenticated users to login before any protected content loads.
 * Cookie 'ezrcm_signed_in' is set on login and cleared on logout (client-side).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const signedIn = request.cookies.get(AUTH_COOKIE)?.value === "1";

  if (!signedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
