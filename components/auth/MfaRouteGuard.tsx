"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AUTH_TOKEN_KEY,
  MFA_USER_ID_KEY,
  MFA_SETUP_USER_ID_KEY,
  MFA_VERIFIED_KEY,
} from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/authentication/verify", "/authentication/setup"];
const MFA_VERIFY_PATH = "/authentication/verify";
const MFA_SETUP_PATH = "/authentication/setup";
const LOGIN_PATH = "/login";

/**
 * Guards protected routes. Redirects to MFA verify/setup or login when:
 * - MFA_USER_ID is set (pending verify) but user navigates away from verify page
 * - MFA_SETUP_USER_ID is set (pending setup) but user navigates away from setup page
 * - No token and not on a public path
 */
export function MfaRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mfaUserId = sessionStorage.getItem(MFA_USER_ID_KEY);
    const mfaSetupUserId = sessionStorage.getItem(MFA_SETUP_USER_ID_KEY);
    const mfaVerified = sessionStorage.getItem(MFA_VERIFIED_KEY) === "true";
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"));

    // Pending MFA verify: user must complete verification before accessing any protected page
    if (mfaUserId && !mfaVerified && pathname !== MFA_VERIFY_PATH && pathname !== LOGIN_PATH) {
      router.replace(MFA_VERIFY_PATH);
      return;
    }

    // Pending MFA setup: user must complete setup before accessing protected pages
    if (mfaSetupUserId && !mfaVerified && pathname !== MFA_SETUP_PATH && pathname !== LOGIN_PATH) {
      router.replace(MFA_SETUP_PATH);
      return;
    }

    // No token and trying to access protected route -> login
    if (!token && !isPublicPath) {
      router.replace(LOGIN_PATH);
      return;
    }

    setAllowed(true);
  }, [pathname, router]);

  // Don't render protected content until we've verified access (avoids flash before redirect)
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
